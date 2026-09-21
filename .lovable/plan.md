# Finish Keepr’s core experience

## Goal
Make the essential two-person workflow reliable, immediate, understandable, and usable on phones and desktops.

## What I’ll change
1. **Reset test data**
   - Remove all existing accounts and their related vault records/files so testing starts clean.
2. **Fix reliability first**
   - Surface data-loading errors instead of showing an endless loading screen.
   - Make sign-in, account creation, username search, connection requests, uploads, approvals, PIN checks, file opening, and expiry recover cleanly from failures.
3. **Strengthen live updates**
   - Keep database subscriptions for instant changes.
   - Add reliable refresh behavior when a tab reconnects or returns to the foreground.
   - Show clear on-screen confirmation when another person acts.
4. **Simplify the main workflow**
   - Make “Add file,” “Connect,” “Request access,” “Approve,” and “Open file” obvious.
   - Clarify that trusted people approve access but do not directly browse another person’s files.
5. **Responsive polish**
   - Ensure dialogs, lists, action buttons, navigation, and file cards fit and remain usable on small screens.
6. **Verify the real flow**
   - Create two fresh accounts and run the complete workflow in separate browser sessions.
   - Confirm real-time connection acceptance and approval, private upload, protected upload, PIN behavior, signed file viewing, and automatic relocking.
   - Check desktop and mobile layouts and resolve any errors found.

## Technical notes
- Keep files private in storage and expose them only through short-lived authorized links.
- Preserve server-side ownership checks, trusted-connection checks, hashed PINs, rate limits, and row-level access rules.
- Do not weaken privacy by making uploaded files publicly accessible.
