# Trust Vault

Build a complete, fully functional full-stack app called Keepr, a privacy-focused shared vault for trusted people.

The core idea is that two users can connect with each other and mutually control access to private photos/files.

Main experience

Users create accounts and log in. Each user has a profile and can search for other users by username.

Users can send connection requests. The other person receives the request and can accept or decline it. Once accepted, they become trusted connections and can interact with each other's protected vaults.

Each user has a private vault where they can upload photos and files.

When uploading a file, the owner can choose:

Private — only the owner can access it.

Protected — access requires approval from a selected trusted connection.

For a protected file, the owner can set a security password/PIN in addition to the approval system.

Access flow

If User A protects a photo and selects User B:

User A → presses Unlock

→ security screen appears

→ User A requests permission

→ User B immediately receives a real-time notification

→ User B sees who is requesting access and which file/vault is being requested

→ User B can Approve or Deny

→ if approved, User A verifies their PIN/password if required

→ the file unlocks for a limited period

→ after the period expires, it automatically becomes locked again.

The same functionality must work in both directions.

Privacy & security

Implement sensible real security for the MVP:

secure authentication

hashed passwords

protected routes

authorization checks on the backend

secure file access

users cannot access another user's private files by changing URLs or requests

protected files cannot be opened without the required permission

PIN/password should never be stored as plain text

session expiration/logout

basic rate limiting and validation

secure environment variables

Do not claim the app provides perfect or unbreakable security.

Real-time

The important actions must happen in real time without refreshing:

connection requests

accepted connections

access requests

approval/denial

notifications

access status changes

Show unread notifications and clear visual feedback for every action.

Dashboard

Create a polished dashboard showing:

My Vault

Protected Files

Trusted Connections

Pending Requests

Notifications

Recent Activity

Users should be able to easily understand whether a file is Locked, Pending Approval, Unlocked, or Expired.

Design

Make the UI feel like a premium modern privacy/security product.

Use a dark, elegant interface with:

subtle glassmorphism

clean typography

refined spacing

thin borders

tasteful shadows

subtle animations

professional icons

responsive desktop and mobile layouts

Make the lock/unlock experience especially polished.

Avoid generic AI-dashboard styling, excessive gradients, excessive cards, childish visuals, or unnecessary features.

Important

This is an MVP, but it must be a real working application, not a visual prototype.

Use whatever reliable full-stack technologies and services are appropriate.

Use a real database and real file storage.

Do not use fake users, fake notifications, fake approvals, or simulated functionality.

The complete test should work:

Create User A → Create User B → connect them → accept connection → A uploads private photo → A protects it → A selects B as approver → A attempts to unlock → B receives real-time request → B approves → A completes security check → A views photo → access expires → photo locks again.

Build this core experience completely and professionally. Leave advanced features such as end-to-end encryption, multiple approvers, emergency access, advanced sharing controls, biometric authentication, and other complex features for later versions.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d5adad44-acfc-497e-92b4-cb8943cf6948).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
