# Wild Color – sito web

Nuovo sito statico (HTML + CSS + JS, nessun CMS) che sostituisce il vecchio WordPress di wildworldhair.com.
Prima si pubblica su GitHub per i test, poi si carica nella cartella `/www` del Micro Hosting Register.it.

## Struttura

```
index.html              Home (per ora: header, menu a panino, footer)
color-chart.html        Cartella colori (fondo bianco, 244 ciocche cliccabili)
assets/
  css/style.css         Stile comune del sito (colori e misure in :root)
  css/color-chart.css   Stile della pagina Color Chart + finestra d'ingrandimento
  js/main.js            Menu a panino, sottomenu, anno nel footer
  js/color-chart.js     Finestra d'ingrandimento delle ciocche
  img/logo/             Loghi
  img/color-chart/
    pages/              Tavole dal PDF (page-1, page-2-left, page-2-right, …) in 900 e 1800 px
    swatches/<linea>/   Ciocche singole per l'ingrandimento (natural-permanent, fashion-permanent,
                        intensifiers, ammonia-free, directs, all-free)
.htaccess               Solo per Register.it (index + HTTPS forzato + cache)
```

## Mappa del menu (dal menu "Header Wild EN" del sito di partenza)

| Voce | Pagina prevista |
|---|---|
| Products → Wild Color Hair Color Cream | da fare |
| Products → Wild Bleach | da fare |
| Products → Wild Peroxide | da fare |
| Color chart | `color-chart.html` ✔ |
| Contact us | da fare |
| Technical information → Technical SDS sheets → Hair Color Cream / Bleach / Peroxide | da fare |
| Technical information → Technical manual | da fare |

I link del menu sono `#` finché la pagina corrispondente non esiste.

## Regole

- Solo percorsi relativi (niente `/` iniziale, niente indirizzi assoluti).
- Nomi di file e cartelle in minuscolo, con trattini, senza spazi né accenti.
- Caricando su Register.it: non copiare `.git`, `.gitignore`, `README.md`.
