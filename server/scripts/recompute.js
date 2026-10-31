import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import { recomputeUser } from '../services/progressService.js';

// Maintenance script: rebuild every user's XP, badges and streak from source data.
// Run after a migration or if cached values are ever suspected to be stale.
await connectDB();
const ids = await User.find().distinct('_id');
for (const id of ids) await recomputeUser(id);
console.log(`Recomputed gamification for ${ids.length} users.`);
await disconnectDB();
