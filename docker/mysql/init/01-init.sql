-- Script de inicialização do banco MySQL para BarberPro
-- Este arquivo será executado automaticamente quando o container MySQL subir

CREATE DATABASE IF NOT EXISTS barberpro;
USE barberpro;

-- Configurações de charset
ALTER DATABASE barberpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar usuário específico para a aplicação (caso não exista)
CREATE USER IF NOT EXISTS 'barberpro'@'%' IDENTIFIED BY 'barberpro123';
GRANT ALL PRIVILEGES ON barberpro.* TO 'barberpro'@'%';
FLUSH PRIVILEGES;

-- Log de inicialização
SELECT 'Banco de dados BarberPro inicializado com sucesso!' as Status;