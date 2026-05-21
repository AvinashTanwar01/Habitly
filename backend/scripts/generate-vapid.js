#!/usr/bin/env node
/**
 * Generate a matching VAPID key pair and print lines for backend/.env and frontend/.env
 * Usage: node scripts/generate-vapid.js
 */
const webpush = require('web-push')
const keys = webpush.generateVAPIDKeys()

console.log('\nAdd these to backend/.env and frontend/.env (VITE_VAPID_PUBLIC_KEY):\n')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log('\nThen restart backend and frontend (npm run dev).\n')
