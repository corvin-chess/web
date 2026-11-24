#!/usr/bin/env node
import { unlinkSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const gi = join(root, "src", "chess", "pkg", ".gitignore")
if (existsSync(gi)) unlinkSync(gi)
