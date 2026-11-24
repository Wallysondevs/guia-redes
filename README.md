# Guia Redes 🌐

Curso de redes de computadores em português, do zero ao avançado, organizado em **3 níveis + projetos + referência**.

Cada aula explica o conceito com analogia do dia a dia, mostra a anatomia (comando/URL/cabeçalho parte por parte), traz a saída real de terminal e deixa você pratiquer no **terminal de rede simulado** (`.try`) — máquina fictícia `ana@notebook` na rede 192.168.1.0/24.

Site 100% estático (HTML + CSS + JS, sem build): abre direto no navegador e funciona no GitHub Pages.

## Estrutura

```
index.html                 página inicial
<tema>.html                uma aula por tema
assets/style.css           visual (tema claro/escuro automático, cor verde "rede")
assets/site.js             níveis/menu (lista NIVEIS), Anterior/Próximo, quiz, anatomia
assets/redesim.js          simulador de terminal de rede + interface das caixas .try
CONTRIBUINDO.md            como escrever uma aula
```

## O que o simulador sabe

Comandos de rede: `ping [-c N]`, `curl [-i|-I|-v|-X|-d|-H] URL`, `wget`, `dig [+short|+trace] [TIPO]`, `nslookup`, `traceroute`, `ip addr|route`, `ifconfig`, `ss -tlnp`, `netstat -tlnp`, `tcpdump -i IFACE`, `nmap`, `nc -zv`, `telnet`, `hostname`, `whois`, `arp -a`, `route -n`, `cat /etc/hosts`, `cat /etc/resolv.conf`, `ssh` (simulado).

Shell básico: `clear`, `echo`, `help`, `exit`, `history`, `sudo ping …`.

## Limitações do simulador

- Não fala com a internet de verdade (DNS, HTTP e rotas são fictícios, com dados realistas).
- `tcpdump`/`nmap`/`ssh` são simulações.

## Publicar no GitHub Pages

Envie a pasta para um repositório e ative **Settings → Pages → Deploy from a branch → main / (root)**.
