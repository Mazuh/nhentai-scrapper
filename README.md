# nhentai -- scrapper

> A simple tool for scrapping 'nhentai' pages. -- エロ漫画 !

## How to use

### Setting up

Have Node 18 or higher installed and in use. Then prepare the dependencies:

```
npm install
```

Now find a gallery you'll want to scrap (it only works with `nhentai.net`
and not its variations).

### Running

Assuming you have a gallery identifier, run for example:

```
npm start 363046
```

It'll print the images URLs in your terminal. And you can also download them:

```
npm start 363046 downloads/
```

A subdirectory called "downloads" will be created inside this repo folder
(git-ignored if you name it like this) to store the scrapped images. You could
use an absolute path to any other directory you want too.
