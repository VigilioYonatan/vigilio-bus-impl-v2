module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "hotfix",
        "refactor",
        "docs",
        "test",
        "ci",
        "build",
        "chore",
        "perf",
        "revert",
      ],
    ],
    "subject-min-length": [2, "always", 8],
  },
};
