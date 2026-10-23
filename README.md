# Wild Color – sito web

Nuovo sito statico (HTML + CSS + JS, nessun CMS) che sostituisce il vecchio WordPress di wildworldhair.com.
Prima si pubblica su GitHub per i test, poi si carica nella cartella `/www` del Micro Hosting Register.it.

## Struttura

```
index.html              Home (per ora: header, menu a panino, footer)
assets/
  css/style.css         Stile unico del sito (colori e misure in :root)
  js/main.js            Menu a panino, sottomenu, anno nel footer
  img/logo/             Loghi
.htaccess               Solo per Register.it (index + HTTPS forzato + cache)
```

## Mappa del menu (dal menu "Header Wild EN" del sito di partenza)

| Voce | Pagina prevista |
|---|---|
| Products → Wild Color Hair Color Cream | da fare |
| Products → Wild Bleach | da fare |
| Products → Wild Peroxide | da fare |
| Contact us | da fare |
| Technical information → Technical SDS sheets → Hair Color Cream / Bleach / Peroxide | da fare |
| Technical information → Technical manual | da fare |
| Technical information → Color chart → Compact / Binder | da fare |

I link del menu sono `#` finché la pagina corrispondente non esiste.

## Regole

- Solo percorsi relativi (niente `/` iniziale, niente indirizzi assoluti).
- Nomi di file e cartelle in minuscolo, con trattini, senza spazi né accenti.
- Caricando su Register.it: non copiare `.git`, `.gitignore`, `README.md`.
