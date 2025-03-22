# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Reasoning

My previous portfolio needed to add html for each new page I wanted (you can see the old version [here](https://github.com/lucasfth/lucas-hanson)).
I wanted to make it easier and mimic a CMS.
Thus I created this project, which mainly needs new markdown files to create new pages.
Though I still need to refer to the files in the code.

Since creating my old one I have also gotten more obsessed with photography, so I wanted to make a portfolio that could showcase my photos better.

You can visit the deployed version [here](https://lucashanson.dk).

## Available Scripts

Run locally with reload:

`npm run start`

Will be available at [http://localhost:3000](http://localhost:3000)

### Build and deploy

`npm run build`

Then:

`npm run deploy`

## Want to use this project?

This project is open source and uses the Apache 2.0 license.
If you are unsure about what that entails, you can read the license [here](./LICENSE).

To get started with using this project, you need to:

1. Fork the repository
2. Clone the repository
3. `cd` into the repository
4. Run `npm install`
5. Run `npm run start`

When you get to building and deploying, I have unfortunately hardcoded my own domain in a few places.
You must therefore need to change the domain in the following files:

- `package.json`
- `CNAME`
- `index.html`

There might be more places, but these are the primary ones.
