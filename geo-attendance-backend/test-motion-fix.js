const motionAnalysisService = require('./src/services/motionAnalysisService');

console.log('🧪 Testing Motion Analysis Fix\n');

// Test cases
const testCases = [
    { name: "Zero data", gyro: [0,0,0], accel: [0,0,0] },
    { name: "Stationary", gyro: [0.001, 0.002, 0.001], accel: [0.1, 9.8, 0.2] },
    { name: "Walking", gyro: [0.5, 0.3, 0.4], accel: [1.2, 9.5, 0.8] },
    { name: "Vehicle", gyro: [0.1, 0.1, 0.1], accel: [2.0, 8.0, 1.5] }
];

testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`);
    console.log(`   Input: gyro=${JSON.stringify(testCase.gyro)}, accel=${JSON.stringify(testCase.accel)}`);
    
    const result = motionAnalysisService.analyzeMotionPattern(testCase.gyro, testCase.accel);
    console.log(`   Result: ${result.motionType} (confidence: ${result.confidence}%, active: ${result.isActive})`);
});