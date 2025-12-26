// ============================================
// BSL ENFORCEMENT - CRYPTOGRAPHIC VERIFICATION
// ============================================
// These hashes verify the enforcement server
// is legitimate and hasn't been tampered with.
// DO NOT MODIFY - Any changes invalidate the bot
// ============================================

const crypto = require('crypto');

// Cryptographic hashes of enforcement server details
// These can only match Daniel's enforcement server
const ENFORCEMENT_HASHES = {
    inviteCode: 'b4821e5d694ef6ad9b042e0e52b87e1483872f4a840a4d30712da7425ca5b8e5',
    serverId: '16fb3e97d241d1e569fb63636cb8ad1f099e9b9002c5383494e7c202a388d290',
    channelId: '84cb91d3bb8318bfad4077b28d2d40928dc7d9f825f963dd65b476b2909418e1'
};

/**
 * Verifies enforcement server credentials are legitimate
 * Prevents tampering with enforcement URLs
 */
function verifyEnforcementServer(inviteCode, serverId, channelId) {
    const inviteHash = crypto.createHash('sha256').update(inviteCode).digest('hex');
    const serverHash = crypto.createHash('sha256').update(serverId).digest('hex');
    const channelHash = crypto.createHash('sha256').update(channelId).digest('hex');

    return inviteHash === ENFORCEMENT_HASHES.inviteCode &&
           serverHash === ENFORCEMENT_HASHES.serverId &&
           channelHash === ENFORCEMENT_HASHES.channelId;
}

/**
 * Gets enforcement server details (obfuscated in code)
 * Returns decrypted values only after verification
 */
function getEnforcementServerDetails() {
    // These look obfuscated but are just base64 encoded
    // Real security is in the hash verification
    const details = {
        inviteCode: Buffer.from('elFyOUdUeHUycw==', 'base64').toString(),
        serverId: Buffer.from('MTE5NTEwMjM3ODE5NTY4MTMx', 'base64').toString(),
        channelId: Buffer.from('MTQ1NDI0MDgxODc3OTkxNDMyMw==', 'base64').toString()
    };

    // Verify these details are legitimate
    if (!verifyEnforcementServer(details.inviteCode, details.serverId, details.channelId)) {
        console.error('');
        console.error('═══════════════════════════════════════════');
        console.error('❌ BSL ENFORCEMENT TAMPERING DETECTED');
        console.error('═══════════════════════════════════════════');
        console.error('');
        console.error('Enforcement server credentials have been modified.');
        console.error('This is a SERIOUS LICENSE VIOLATION.');
        console.error('');
        console.error('Attempting to bypass BSL enforcement is:');
        console.error('• A breach of the license agreement');
        console.error('• Evidence of intent to violate');
        console.error('• Subject to immediate legal action');
        console.error('');
        console.error('Restore original enforcement configuration');
        console.error('or cease using this software immediately.');
        console.error('');
        console.error('Contact: legal@barrersoftware.com');
        console.error('');
        console.error('═══════════════════════════════════════════');
        console.error('');
        process.exit(1);
    }

    return details;
}

/**
 * Owner ID for violation command (also hashed)
 */
const OWNER_ID_HASH = '16fb3e97d241d1e569fb63636cb8ad1f099e9b9002c5383494e7c202a388d290';

function verifyOwner(userId) {
    const userHash = crypto.createHash('sha256').update(userId).digest('hex');
    return userHash === OWNER_ID_HASH;
}

module.exports = {
    getEnforcementServerDetails,
    verifyEnforcementServer,
    verifyOwner,
    OWNER_ID_HASH
};
