// Unit-test config, deliberately separate from ./test/jest-e2e.json.
// Targets *.spec.ts files colocated with source (standard Nest layout) and
// never touches a database -- every spec here mocks its collaborators.
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node'
}
