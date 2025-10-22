#  Como Executar o Projeto

Siga os passos abaixo para configurar e enviar suas alterações no repositório.

---

##  Configuração Inicial do Git

Execute os comandos abaixo **apenas na primeira vez** que for usar o Git na máquina. **Faça-os pelo CMD**

```bash
git config --global user.name "Seu Nome"
```
```bash
git config --global user.email "Seu email"

```
---


##  Use este comando APENAS se for fazer as alterações no pc da escola

```bash
git config --global http.proxy http://17.1.0.1:3128
```
---

## Clonar o repositório remoto

```bash
git clone https://github.com/DaviFelixDeOliveira/Aper.git
```
---

## Abra a pasta no Visual Studio Code
```bash
code .
```

---

### Após suas alterações (ainda no Visual Studio Code)

```js
git add .
```

```js

git commit -m "Mensagem de commit"
```

```js
git push
```
#### **Aviso:** verifique se está na pasta do repositório corretamente antes de fazer os comandos abaixo.

-  Ex: o projeto está na pasta `Users/User/Aper`, você deve estar dentro desta pasta para executar os comandos git. Para entra na pasta use cd Aper.

#### **Aviso:** Caso faça as alterações no clone do repositório de **sua máquina**, use o comando abaixo para que, os commits que foram feitos por outros membros, não venham entrar em conflito com as alterações que você fez.

````js
git pull
````