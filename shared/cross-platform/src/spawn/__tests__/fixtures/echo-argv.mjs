import { argv, stdout } from "node:process";

stdout.write(argv[2] ?? "");
