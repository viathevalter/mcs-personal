const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env manually to avoid depending on dotenv installation
const envPath = path.join(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    acc[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE variables in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const emailsToCreate = [
  "alex@gestaologinpro.com",
  "ana@gestaologinpro.com",
  "andres@gestaologinpro.com",
  "christian@gestaologinpro.com",
  "imel@gestaologinpro.com",
  "kawan@gestaologinpro.com",
  "luis@gestaologinpro.com",
  "maria.rabelo@gestaologinpro.com",
  "nairelis@gestaologinpro.com",
  "olga@gestaologinpro.com",
  "rebecca@gestaologinpro.com",
  "wolmer@gestaologinpro.com",
  "leidys@gestaologinpro.com"
];

const DEFAULT_PASSWORD = "Password123!@#";

async function execute() {
  console.log(`Starting to create/check ${emailsToCreate.length} users...\n`);

  for (const email of emailsToCreate) {
    try {
      console.log(`Processing: ${email}...`);

      // 1. Check if user already exists
      const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
      let user = users.find(u => u.email === email);

      if (!user) {
        // 2. Create the user
        const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: DEFAULT_PASSWORD,
          email_confirm: true
        });

        if (createError) {
          console.error(`  [X] Auth Creation Error for ${email}:`, createError.message);
          continue;
        }
        user = newUserData.user;
        console.log(`  [+] Created Auth User (ID: ${user.id})`);
      } else {
        console.log(`  [~] User already exists in Auth (ID: ${user.id})`);
      }

      // 3. Assign role in public.user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: user.id, role: 'visualizador' }, { onConflict: 'user_id' });

      if (roleError) {
        console.error(`  [X] Failed to set 'visualizador' role for ${email}:`, roleError.message);
      } else {
        console.log(`  [V] Role set to 'visualizador' successfully.`);
      }

      console.log('-----------------------------------');

    } catch (e) {
      console.error(`Unexpected error processing ${email}:`, e);
    }
  }
  console.log("\nFinished processing all users.");
}

execute();
