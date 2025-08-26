#!/usr/bin/env python3
"""
Script para testar a conectividade com o banco de dados PostgreSQL
"""
import os
import sys
import psycopg2
from psycopg2 import OperationalError

def test_db_connection():
    """Testa a conexão com o banco PostgreSQL"""
    
    # Configurações do banco
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'tg'),
        'user': os.getenv('DB_USER', 'tg'),
        'password': os.getenv('DB_PASS', 'changeme')
    }
    
    print("🔍 Testando conexão com PostgreSQL...")
    print(f"📍 Host: {db_config['host']}:{db_config['port']}")
    print(f"🗄️  Database: {db_config['database']}")
    print(f"👤 User: {db_config['user']}")
    print()
    
    try:
        # Tentativa de conexão
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Teste básico
        cursor.execute('SELECT version();')
        version = cursor.fetchone()
        
        print("✅ Conexão bem-sucedida!")
        print(f"🐘 PostgreSQL Version: {version[0]}")
        
        # Verificar se as tabelas existem
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        if tables:
            print(f"📋 Tabelas encontradas: {len(tables)}")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("⚠️  Nenhuma tabela encontrada (normal na primeira execução)")
        
        cursor.close()
        conn.close()
        
        return True
        
    except OperationalError as e:
        print("❌ Erro de conexão!")
        print(f"💥 {e}")
        print()
        print("🔧 Possíveis soluções:")
        print("   1. Verificar se o PostgreSQL está rodando")
        print("   2. Conferir credenciais no arquivo .env")
        print("   3. Verificar configurações de rede/firewall")
        return False
        
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

def main():
    # Tentar carregar .env se existir
    env_file = '.env'
    if os.path.exists(env_file):
        print(f"📁 Carregando variáveis de {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
    
    success = test_db_connection()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
