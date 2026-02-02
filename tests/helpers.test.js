const { 
    isPositiveInt,
    isEmail,
    isNonEmptyString,
    userTokenCreate
} = require("utils/helpers.js");

test('checks if a variable is a positive int', () => {
    console.log("running test")
    expect(isPositiveInt(3)).toBe(true);
    expect(isPositiveInt("string")).toBe(false);
});

test('checks if a string matches the pattern of an email', () => {
    expect(isEmail("example@example.com")).toBe(true);
    expect(isEmail("string")).toBe(false);
});

test('checks if a variable is a non-empty string', () => {
    expect(isNonEmptyString("string")).toBe(true);
    expect(isNonEmptyString("")).toBe(false);
});

test('checks if the user token generation is right', () => {
    const token = userTokenCreate();

    expect(typeof token).toBe('string');
    expect(token.length).toBe(18);
});