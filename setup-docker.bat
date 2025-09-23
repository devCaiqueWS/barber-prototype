@echo off
echo ========================================
echo   BarberPro - Configuracao Docker MySQL
echo ========================================
echo.

echo 1. Iniciando containers Docker...
docker-compose up -d

echo.
echo 2. Aguardando MySQL inicializar (30 segundos)...
timeout /t 30 /nobreak > nul

echo.
echo 3. Configurando ambiente para MySQL...
copy .env.docker .env > nul
copy prisma\schema.mysql.prisma prisma\schema.prisma > nul

echo.
echo 4. Gerando cliente Prisma...
call npx prisma generate

echo.
echo 5. Aplicando schema no banco...
call npx prisma db push

echo.
echo 6. Populando banco com dados de teste...
call npx tsx prisma/seed.ts

echo.
echo ========================================
echo   Configuracao concluida!
echo ========================================
echo.
echo Servicos disponiveis:
echo - Aplicacao: http://localhost:3000
echo - phpMyAdmin: http://localhost:8080
echo.
echo Para iniciar a aplicacao, execute:
echo npm run dev
echo.
echo Para parar os containers:
echo docker-compose down
echo.
pause