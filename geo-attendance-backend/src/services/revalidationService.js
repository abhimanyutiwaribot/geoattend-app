const RevalidationChallenge = require("../models/revalidationChallenge");

class RevalidationService {
    
    // Generate a revalidation challenge
    async generateChallenge(userId, attendanceId, challengeType = "qr_scan") {
        try {
            // Check if there's already a pending challenge for this attendance session
            const existingChallenge = await RevalidationChallenge.findOne({
                userId,
                attendanceId,
                status: "pending",
                expiresAt: { $gt: new Date() } // Not expired
            });

            if (existingChallenge) {
                // Return existing challenge instead of creating a new one
                const clientData = this.getClientChallengeData(existingChallenge);
                if (challengeType === "wordle") {
                    clientData.wordLength = existingChallenge.challengeData.wordLength;
                    clientData.maxAttempts = existingChallenge.maxAttempts;
                }
                return {
                    success: true,
                    challengeId: existingChallenge._id,
                    challengeType: existingChallenge.challengeType,
                    challengeData: clientData,
                    expiresAt: existingChallenge.expiresAt,
                    isExisting: true
                };
            }

            const challengeData = this.generateChallengeData(challengeType);
            
            const challenge = new RevalidationChallenge({
                userId,
                attendanceId,
                challengeType,
                challengeData,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                status: "pending",
                maxAttempts: challengeType === "wordle" ? 4 : 3 // Wordle gets 4 attempts
            });

            await challenge.save();

            const clientData = this.getClientChallengeData(challenge);
            // Include wordLength and maxAttempts for wordle challenges
            if (challengeType === "wordle") {
                clientData.wordLength = challenge.challengeData.wordLength;
                clientData.maxAttempts = challenge.maxAttempts;
            }

            return {
                success: true,
                challengeId: challenge._id,
                challengeType: challenge.challengeType,
                challengeData: clientData,
                expiresAt: challenge.expiresAt
            };
        } catch (error) {
            console.error("Challenge generation error:", error);
            return { success: false, error: error.message };
        }
    }

    // Generate different types of challenge data
    generateChallengeData(challengeType) {
        switch (challengeType) {
            case "wordle":
                // 4-letter words for simplicity (college project)
                const wordList = [
                    "WORK", "DESK", "TEAM", "CODE", "TASK", "MEET", "TIME", "PLAN",
                    "GOAL", "DATA", "FILE", "USER", "ROLE", "MODE", "PAGE", "SITE",
                    "LINK", "TEXT", "MAIL", "CHAT", "ZOOM", "CALL", "NOTE", "LIST"
                ];
                const solutionWord = wordList[Math.floor(Math.random() * wordList.length)];
                return {
                    solutionWord: solutionWord.toUpperCase(),
                    wordLength: solutionWord.length,
                    guesses: []
                };
            
            case "qr_scan":
                return {
                    qrCode: `ATT_CHALLENGE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
            
            case "pattern_match":
                const patterns = ["up", "down", "left", "right"];
                const randomPattern = Array.from({ length: 4 }, 
                    () => patterns[Math.floor(Math.random() * patterns.length)]
                );
                return { pattern: randomPattern };
            
            case "question":
                const questions = [
                    { q: "What is your birth year?", a: "1990" }, // In real app, get from user profile
                    { q: "What is 5 + 3?", a: "8" },
                    { q: "What day is today?", a: new Date().getDate().toString() }
                ];
                const randomQ = questions[Math.floor(Math.random() * questions.length)];
                return { 
                    question: randomQ.q, 
                    correctAnswer: randomQ.a 
                };
            
            default:
                return { qrCode: `DEFAULT_${Date.now()}` };
        }
    }

    // Prepare challenge data for client (hide sensitive info)
    getClientChallengeData(challenge) {
        const data = { ...challenge.challengeData };
        
        // Don't send correct answer to client for question challenges
        if (challenge.challengeType === "question") {
            delete data.correctAnswer;
        }
        
        // Don't send solution word to client for wordle challenges
        if (challenge.challengeType === "wordle") {
            delete data.solutionWord;
            delete data.guesses;
        }
        
        return data;
    }

    // Validate challenge response
    async validateChallengeResponse(challengeId, response, userId) {
        try {
            const challenge = await RevalidationChallenge.findOne({
                _id: challengeId,
                userId: userId,
                status: "pending"
            });

            if (!challenge) {
                return { 
                    success: false, 
                    isValid: false, 
                    error: "Challenge not found or expired" 
                };
            }

            if (challenge.expiresAt < new Date()) {
                challenge.status = "expired";
                await challenge.save();
                return { 
                    success: false, 
                    isValid: false, 
                    error: "Challenge expired" 
                };
            }

            challenge.attempts += 1;

            const validationResult = this.validateResponse(challenge, response);

            if (challenge.challengeType === "wordle" && validationResult.isValid === false) {
                // For wordle, we need to return per-letter feedback
                challenge.challengeData.guesses = challenge.challengeData.guesses || [];
                challenge.challengeData.guesses.push(response.guess);
                await challenge.save();
                
                if (challenge.attempts >= challenge.maxAttempts) {
                    challenge.status = "failed";
                    await challenge.save();
                    return {
                        success: false,
                        isValid: false,
                        error: "Max attempts exceeded",
                        perLetterResults: validationResult.perLetterResults,
                        attemptsLeft: 0
                    };
                } else {
                    await challenge.save();
                    return {
                        success: false,
                        isValid: false,
                        error: "Incorrect guess",
                        perLetterResults: validationResult.perLetterResults,
                        attemptsLeft: challenge.maxAttempts - challenge.attempts
                    };
                }
            }

            const isValid = validationResult.isValid || validationResult === true;

            if (isValid) {
                challenge.status = "completed";
                await challenge.save();
                return { success: true, isValid: true, message: "Challenge passed" };
            } else {
                if (challenge.attempts >= challenge.maxAttempts) {
                    challenge.status = "failed";
                    await challenge.save();
                    return { 
                        success: false, 
                        isValid: false, 
                        error: "Max attempts exceeded" 
                    };
                } else {
                    await challenge.save();
                    return { 
                        success: false, 
                        isValid: false, 
                        error: "Invalid response", 
                        attemptsLeft: challenge.maxAttempts - challenge.attempts 
                    };
                }
            }
        } catch (error) {
            console.error("Challenge validation error:", error);
            return { success: false, isValid: false, error: error.message };
        }
    }

    // Validate specific challenge types
    validateResponse(challenge, response) {
        switch (challenge.challengeType) {
            case "wordle":
                const guess = (response.guess || "").toUpperCase().trim();
                const solution = challenge.challengeData.solutionWord.toUpperCase();
                
                if (guess.length !== solution.length) {
                    return { isValid: false, perLetterResults: null };
                }
                
                if (guess === solution) {
                    return { isValid: true, perLetterResults: null };
                }
                
                // Generate per-letter feedback (Wordle-style)
                const perLetterResults = this.generateWordleFeedback(guess, solution);
                return { isValid: false, perLetterResults };
            
            case "qr_scan":
                return response.scannedCode === challenge.challengeData.qrCode;
            
            case "pattern_match":
                return JSON.stringify(response.pattern) === 
                       JSON.stringify(challenge.challengeData.pattern);
            
            case "question":
                return response.answer?.toLowerCase() === 
                       challenge.challengeData.correctAnswer.toLowerCase();
            
            default:
                return false;
        }
    }

    // Generate Wordle-style feedback: "correct", "present", "absent"
    generateWordleFeedback(guess, solution) {
        const result = Array(guess.length).fill("absent");
        const solutionCounts = {};
        const guessCounts = {};
        
        // Count letters in solution
        for (let i = 0; i < solution.length; i++) {
            const letter = solution[i];
            solutionCounts[letter] = (solutionCounts[letter] || 0) + 1;
        }
        
        // First pass: mark correct positions
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === solution[i]) {
                result[i] = "correct";
                solutionCounts[guess[i]]--;
            }
        }
        
        // Second pass: mark present (but not correct) positions
        for (let i = 0; i < guess.length; i++) {
            if (result[i] !== "correct") {
                const letter = guess[i];
                if (solutionCounts[letter] > 0) {
                    result[i] = "present";
                    solutionCounts[letter]--;
                }
            }
        }
        
        return result;
    }
}

module.exports = new RevalidationService();