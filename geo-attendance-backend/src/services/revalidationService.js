const RevalidationChallenge = require("../models/revalidationChallenge");

class RevalidationService {
    
    // Generate a revalidation challenge
    async generateChallenge(userId, attendanceId, challengeType = "qr_scan") {
        try {
            const challengeData = this.generateChallengeData(challengeType);
            
            const challenge = new RevalidationChallenge({
                userId,
                attendanceId,
                challengeType,
                challengeData,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                status: "pending"
            });

            await challenge.save();

            return {
                success: true,
                challengeId: challenge._id,
                challengeType: challenge.challengeType,
                challengeData: this.getClientChallengeData(challenge),
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

            const isValid = this.validateResponse(challenge, response);

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
}

module.exports = new RevalidationService();