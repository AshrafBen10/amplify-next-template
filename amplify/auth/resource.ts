import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
    // You can optionally configure specific email settings
    email: {
      // Optional: configure verification settings
      verificationEmailSubject: "Your verification code",
      verificationEmailBody: "Your verification code is {####}",
      // Optional: configure password settings
      passwordSettings: {
        minLength: 8,
        requireNumbers: true,
        requireSpecialCharacters: true,
        requireUppercase: true,
        requireLowercase: true,
      }
    }
  }
});
