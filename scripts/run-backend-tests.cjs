const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");
const useShell = process.platform === "win32";

function commandAvailable(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    shell: useShell,
    stdio: "ignore",
  });

  return result.status === 0;
}

function run(command, args, cwd = backendDir) {
  const result = spawnSync(command, args, {
    cwd,
    shell: useShell,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

if (commandAvailable("poetry")) {
  console.log("Running backend tests with Poetry...");
  run("poetry", ["run", "pytest"]);
}

const python = process.env.PYTHON || "python";

if (!commandAvailable(python, ["--version"])) {
  console.error(
    "Poetry is not installed and no usable Python interpreter was found. Install Poetry or set PYTHON.",
  );
  process.exit(1);
}

console.log("Poetry not found; running backend tests with the current Python environment...");
run(python, ["-m", "pytest", "tests"]);
