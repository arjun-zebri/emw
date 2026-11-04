// Sets (or resets) the password for a portal account, taking the password from the clipboard so it
// never appears in the terminal, shell history or chat. Creates the account if it doesn't exist.
//
//   1. Copy the new password (10+ characters).
//   2. node --env-file=.env.local scripts/set-password.mjs someone@example.com
//
// The account still needs a role to get in: a row in team_members, or one in vendor_members.

import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email?.includes("@")) throw new Error("Usage: node --env-file=.env.local scripts/set-password.mjs <email>");

const password = execFileSync("pbpaste", { encoding: "utf8" }).trim();
if (password.length < 10) throw new Error("Copy a password of at least 10 characters first.");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const user = data.users.find((u) => u.email?.toLowerCase() === email);

const result = user
  ? await admin.auth.admin.updateUserById(user.id, { password })
  : await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (result.error) throw result.error;

// Clear the clipboard so the password doesn't linger.
execFileSync("pbcopy", { input: "" });
console.log(`${user ? "Updated" : "Created"} ${email}. Clipboard cleared.`);
