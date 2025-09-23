# Guia para usar MySQL com Docker

## 1. Iniciar o MySQL com Docker

```bash
# Subir o banco MySQL e phpMyAdmin
docker-compose up -d

# Verificar se os containers estão rodando
docker-compose ps
```

## 2. Configurar o ambiente para MySQL

```bash
# Copiar configuração para MySQL
copy .env.docker .env

# Copiar schema para MySQL
copy prisma\schema.mysql.prisma prisma\schema.prisma
```

## 3. Configurar o Prisma com MySQL

```bash
# Gerar o cliente Prisma
npx prisma generate

# Aplicar as migrações
npx prisma db push

# (Opcional) Popular o banco com dados de teste
npx tsx prisma/seed.ts
```

## 4. Iniciar a aplicação

```bash
npm run dev
```

## 5. Acessar os serviços

- **Aplicação**: http://localhost:3000
- **phpMyAdmin**: http://localhost:8080
  - Usuário: `root`
  - Senha: `root123`

## 6. Parar os containers

```bash
# Parar e remover containers
docker-compose down

# Parar e remover containers + volumes (apaga dados)
docker-compose down -v
```

## Comandos úteis

```bash
# Ver logs do MySQL
docker-compose logs mysql

# Conectar ao MySQL via terminal
docker-compose exec mysql mysql -u root -p barberpro

# Backup do banco
docker-compose exec mysql mysqldump -u root -p barberpro > backup.sql

# Restaurar backup
docker-compose exec -i mysql mysql -u root -p barberpro < backup.sql
```

## Troubleshooting

### Erro de conexão:
1. Verifique se o container está rodando: `docker-compose ps`
2. Verifique se a porta 3306 não está sendo usada por outro MySQL

### Erro de permissão:
1. Pare os containers: `docker-compose down`
2. Remova os volumes: `docker-compose down -v`
3. Suba novamente: `docker-compose up -d`

### Reset completo:
```bash
docker-compose down -v
docker-compose up -d
copy .env.docker .env
npx prisma db push
npx tsx prisma/seed.ts
```