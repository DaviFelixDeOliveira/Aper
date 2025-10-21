#  Como Executar o Projeto

Siga os passos abaixo para configurar e enviar suas alterações no repositório.

---

##  Configuração Inicial do Git

Execute os comandos abaixo **apenas na primeira vez** que for usar o Git na máquina:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "Seu email"

```
---


##  Use este comando se for fazer as alterações no pc da escola

Execute os comandos abaixo **apenas na primeira vez** que for usar o Git na máquina:

```bash
git config --global http.proxy http://17.1.0.1:3128
```


```bash
git clone https://github.com/DaviFelixDeOliveira/Aper_App_Filme.git
```


---

### Após suas alterações

```js
git pull
// para puxar possíveis alterações que foram feitas por outros membros 

git commit -m "Mensagem de commit"
git push
```