import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.dkhbrtzyrlqilebfsonx:200588Ykwsj%24@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'

async function main() {
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  })

  const migrationDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort()

  console.log(`Found ${files.length} migration files\n`)

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8')
    console.log(`Running: ${file} (${sql.length} bytes)...`)
    try {
      await pool.query(sql)
      console.log(`  ✅ OK`)
    } catch (err: any) {
      console.log(`  ⚠️  ${err.message.slice(0, 120)}`)
    }
  }

  // Verify
  const { rows } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `)
  console.log(`\nTables created: ${rows.map((r: any) => r.table_name).join(', ')}`)

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
