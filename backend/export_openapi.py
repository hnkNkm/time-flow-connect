#!/usr/bin/env python3
"""
FastAPIアプリケーションからOpenAPIスキーマをエクスポートするスクリプト
"""
import json
import yaml
import sys
from pathlib import Path

# プロジェクトのルートディレクトリをPythonパスに追加
sys.path.insert(0, str(Path(__file__).parent))

from src.main import app

def export_openapi():
    """OpenAPIスキーマをJSONとYAML形式でエクスポート"""
    # OpenAPIスキーマを取得
    openapi_schema = app.openapi()
    
    # プロジェクトルートディレクトリのパス
    root_dir = Path(__file__).parent.parent
    
    # JSON形式で保存
    json_path = root_dir / "openapi.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
    print(f"OpenAPI schema exported to: {json_path}")
    
    # YAML形式で保存
    yaml_path = root_dir / "openapi.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(openapi_schema, f, allow_unicode=True, sort_keys=False)
    print(f"OpenAPI schema exported to: {yaml_path}")
    
    # エンドポイント数を表示
    endpoints = len(openapi_schema.get("paths", {}))
    print(f"Total endpoints: {endpoints}")
    
    # 各エンドポイントを表示
    print("\nAvailable endpoints:")
    for path, methods in openapi_schema.get("paths", {}).items():
        for method in methods.keys():
            print(f"  {method.upper()} {path}")

if __name__ == "__main__":
    export_openapi()