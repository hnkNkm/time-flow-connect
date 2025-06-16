import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// FastAPIのOpenAPIエンドポイントからスキーマを取得
const getOpenAPISchema = async () => {
  try {
    const response = await fetch('http://localhost:8000/openapi.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error('Failed to fetch OpenAPI schema: ' + error.message);
  }
};

// メイン処理
const main = async () => {
  try {
    console.log('Fetching OpenAPI schema from FastAPI...');
    const schema = await getOpenAPISchema();
    
    // スキーマをファイルに保存
    const outputPath = join(__dirname, '..', 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(schema, null, 2));
    
    console.log(`OpenAPI schema saved to: ${outputPath}`);
    console.log(`Total endpoints: ${Object.keys(schema.paths || {}).length}`);
    
    // エンドポイントのリストを表示
    console.log('\nAvailable endpoints:');
    for (const [path, methods] of Object.entries(schema.paths || {})) {
      for (const method of Object.keys(methods)) {
        console.log(`  ${method.toUpperCase()} ${path}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nMake sure the FastAPI server is running on http://localhost:8000');
    console.error('You can start it with: docker-compose up backend');
    process.exit(1);
  }
};

main();