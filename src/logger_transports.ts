import process from "node:process";

function transportToStderr(message: string): void {
  process.stderr.write(message);
  process.stderr.write("\n");
}

function transportToStdout(message: string): void {
  process.stdout.write(message);
  process.stdout.write("\n");
}

export { transportToStderr, transportToStdout };
