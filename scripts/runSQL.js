import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Supabase postgres connection string
const connectionString = process.env.VITE_SUPABASE_URL.replace('https://', 'postgresql://postgres:') + '...';
// Wait, we don't have the DB password in VITE_SUPABASE_URL.
// VITE_SUPABASE_URL = https://pyahcgorkvwfwmlzspnv.supabase.co
