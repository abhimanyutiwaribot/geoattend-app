class CognitiveService {
  /**
   * Generate a random cognitive challenge
   */
  generateChallenge(challengeType) {
    switch (challengeType) {
      case 'reaction_time':
        return this.generateReactionTimeChallenge();
      case 'color_match':
        return this.generateColorMatchChallenge();
      case 'pattern_memory':
        return this.generatePatternMemoryChallenge();
      case 'math_quick':
        return this.generateMathQuickChallenge();
      default:
        throw new Error('Invalid challenge type');
    }
  }

  /**
   * Reaction Time Challenge
   * User must tap when a colored circle appears
   */
  generateReactionTimeChallenge() {
    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7'];
    const targetAppearTime = 1000 + Math.floor(Math.random() * 2000); // 1-3 seconds
    const expectedColor = colors[Math.floor(Math.random() * colors.length)];

    return {
      targetAppearTime,
      expectedColor
    };
  }

  /**
   * Color Match Challenge (Stroop Effect)
   * Shows word "RED" in blue color, user must tap the TEXT color
   */
  generateColorMatchChallenge() {
    const colors = [
      { name: 'RED', hex: '#ef4444' },
      { name: 'GREEN', hex: '#22c55e' },
      { name: 'BLUE', hex: '#3b82f6' },
      { name: 'YELLOW', hex: '#f59e0b' },
      { name: 'PURPLE', hex: '#a855f7' }
    ];

    // Pick random word and different color for text
    const wordColor = colors[Math.floor(Math.random() * colors.length)];
    let textColor;
    do {
      textColor = colors[Math.floor(Math.random() * colors.length)];
    } while (textColor.name === wordColor.name);

    return {
      colorWord: wordColor.name,
      textColor: textColor.hex,
      correctAnswer: textColor.name // Answer is the TEXT color, not the word
    };
  }

  /**
   * Pattern Memory Challenge
   * Show 4-digit pattern, user must reproduce
   */
  generatePatternMemoryChallenge() {
    const pattern = [];
    for (let i = 0; i < 4; i++) {
      pattern.push(Math.floor(Math.random() * 9) + 1); // 1-9
    }

    return {
      pattern
    };
  }

  /**
   * Quick Math Challenge
   * Simple addition/subtraction
   */
  generateMathQuickChallenge() {
    const operations = ['+', '-'];
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let num1, num2, correctAnswer;

    if (operation === '+') {
      num1 = Math.floor(Math.random() * 20) + 1; // 1-20
      num2 = Math.floor(Math.random() * 20) + 1;
      correctAnswer = num1 + num2;
    } else {
      num1 = Math.floor(Math.random() * 30) + 10; // 10-40
      num2 = Math.floor(Math.random() * num1); // Ensure positive result
      correctAnswer = num1 - num2;
    }

    return {
      equation: `${num1} ${operation} ${num2}`,
      correctAnswer
    };
  }

  /**
   * Validate user response
   */
  validateResponse(challengeType, challengeData, userResponse) {
    switch (challengeType) {
      case 'reaction_time':
        // For reaction time, just tapping is correct (timing validated separately)
        return userResponse === true;

      case 'color_match':
        return userResponse === challengeData.correctAnswer;

      case 'pattern_memory':
        // Compare arrays
        if (!Array.isArray(userResponse) || userResponse.length !== challengeData.pattern.length) {
          return false;
        }
        return userResponse.every((val, idx) => val === challengeData.pattern[idx]);

      case 'math_quick':
        return parseInt(userResponse) === challengeData.correctAnswer;

      default:
        return false;
    }
  }

  /**
   * Validate response timing (200ms - 5000ms is human range)
   */
  isHumanTiming(responseTime) {
    return responseTime >= 200 && responseTime <= 5000;
  }
}

module.exports = CognitiveService;
