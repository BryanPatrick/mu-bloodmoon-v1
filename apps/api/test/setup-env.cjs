// Existing feature E2E suites do not test the external CAPTCHA provider.
// auth-abuse.e2e-spec.ts explicitly disables this flag and covers that boundary.
process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
