import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <>
      <footer className='common-container'>
        <div className='inner-container'>
          <h2>🔗 Socials</h2>
          {/* Social Links vertically spread out*/}
          <div className='social-links'>
            <a href="https://rdr.lucashanson.dk/ig" target="_blank" rel="noopener noreferrer">
              <img src="https://img.shields.io/badge/Instagram-dd2a7b?logo=instagram&logoColor=white" />
            </a>
            <a href="https://rdr.lucashanson.dk/yt" target="_blank" rel="noopener noreferrer">
              <img src="https://img.shields.io/badge/YouTube-ff0000?logo=youtube&logoColor=white" />
            </a>
            <a href="https://rdr.lucashanson.dk/li" target="_blank" rel="noopener noreferrer">
              <img src="https://img.shields.io/badge/LinkedIn-0077b5?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMjU2JyBoZWlnaHQ9JzI1NicgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSd4TWlkWU1pZCcgdmlld0JveD0nMCAwIDI1NiAyNTYnPjxwYXRoIGQ9J00yMTguMTIzIDIxOC4xMjdoLTM3LjkzMXYtNTkuNDAzYzAtMTQuMTY1LS4yNTMtMzIuNC0xOS43MjgtMzIuNC0xOS43NTYgMC0yMi43NzkgMTUuNDM0LTIyLjc3OSAzMS4zNjl2NjAuNDNoLTM3LjkzVjk1Ljk2N2gzNi40MTN2MTYuNjk0aC41MWEzOS45MDcgMzkuOTA3IDAgMCAxIDM1LjkyOC0xOS43MzNjMzguNDQ1IDAgNDUuNTMzIDI1LjI4OCA0NS41MzMgNTguMTg2bC0uMDE2IDY3LjAxM1pNNTYuOTU1IDc5LjI3Yy0xMi4xNTcuMDAyLTIyLjAxNC05Ljg1Mi0yMi4wMTYtMjIuMDA5LS4wMDItMTIuMTU3IDkuODUxLTIyLjAxNCAyMi4wMDgtMjIuMDE2IDEyLjE1Ny0uMDAzIDIyLjAxNCA5Ljg1MSAyMi4wMTYgMjIuMDA4QTIyLjAxMyAyMi4wMTMgMCAwIDEgNTYuOTU1IDc5LjI3bTE4Ljk2NiAxMzguODU4SDM3Ljk1Vjk1Ljk2N2gzNy45N3YxMjIuMTZaTTIzNy4wMzMuMDE4SDE4Ljg5QzguNTgtLjA5OC4xMjUgOC4xNjEtLjAwMSAxOC40NzF2MjE5LjA1M2MuMTIyIDEwLjMxNSA4LjU3NiAxOC41ODIgMTguODkgMTguNDc0aDIxOC4xNDRjMTAuMzM2LjEyOCAxOC44MjMtOC4xMzkgMTguOTY2LTE4LjQ3NFYxOC40NTRjLS4xNDctMTAuMzMtOC42MzUtMTguNTg4LTE4Ljk2Ni0xOC40NTMnIGZpbGw9JyNmZmYnLz48L3N2Zz4K" />
            </a>
            <a href="mailto:contact+gh@lucashanson.dk" target="_blank" rel="noopener noreferrer">
              <img src="https://img.shields.io/badge/Email-1C7EF3?logo=data:image/svg+xml;base64,PHN2ZyBpZD0nTGF5ZXJfMScgZGF0YS1uYW1lPSdMYXllciAxJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMTEuOTMgMTIyLjg4Jz48dGl0bGU+YXQtdGhlLXJhdGU8L3RpdGxlPjxwYXRoIGZpbGw9JyNmZmYnIGQ9J000Ni40LDYzLjkyYTM1LjEsMzUuMSwwLDAsMCwuMzQsOS4xNiwxMCwxMCwwLDAsMCwyLjYyLDUuNDgsNi42MSw2LjYxLDAsMCwwLDQuNzgsMS44MSw3LjQ0LDcuNDQsMCwwLDAsMy4xNC0uODhBMTAuNTcsMTAuNTcsMCwwLDAsNjEsNzUuODFhMTkuODIsMTkuODIsMCwwLDAsMi4zLTUuMDdsMi41LTI5LjA4YTE2LjUsMTYuNSwwLDAsMC0zLjM4LS4zNUExMywxMywwLDAsMCw1My45NCw0NGExNi44OSwxNi44OSwwLDAsMC01LDcuNjcsNTYuNzYsNTYuNzYsMCwwLDAtMi41NSwxMi4zWk02NS41Nyw4NS44NWEyMS41NCwyMS41NCwwLDAsMS0zLjQ3LDMuNTlBMjAuODgsMjAuODgsMCwwLDEsNDguNTIsOTRhMTcuNzUsMTcuNzUsMCwwLDEtMTEuMTctMy43LDIxLjgsMjEuOCwwLDAsMS03LjA4LTEwLjQ5LDM4LjI5LDM4LjI5LDAsMCwxLTEuNDUtMTUuODksNTQuMTYsNTQuMTYsMCwwLDEsNS44My0xOS4yN0EzNC42NCwzNC42NCwwLDAsMSw0NS44NCwzMiwyNi44OCwyNi44OCwwLDAsMSw2MSwyNy41cTgsMCwxMi41LDIuMjRhOTAuMTMsOTAuMTMsMCwwLDEsOC43MSw1TDc4Ljg3LDc0YTEwLjMzLDEwLjMzLDAsMCwwLDAsMy43NSw1LDUsMCwwLDAsMS4yNywyLjM3LDQuNzgsNC43OCwwLDAsMCwyLjA3LDEuMjYsOC4yNiw4LjI2LDAsMCwwLDktMi45MSwyNC42NSwyNC42NSwwLDAsMCw0LjU4LTguOTQsNDcuMiw0Ny4yLDAsMCwwLDItMTIuNzJxLjY0LTEzLjE0LTMuMzItMjMuMmEzMi4yLDMyLjIsMCwwLDAtMTIuNzMtMTUuN1E3MywxMi4yMiw1OS4xNywxMi4yM3EtMTMuMzEsMC0yMi44Myw2Ljc3QTQ1LDQ1LDAsMCwwLDIxLjQ1LDM3LjI1YTY5LDY5LDAsMCwwLTYsMjUuNjgsNjYuMjYsNjYuMjYsMCwwLDAsMS44OSwyMC41MywzNS40NSwzNS40NSwwLDAsMCw3LjUsMTQuMzcsMzEsMzEsMCwwLDAsMTIuNzIsOC40NkE1MC44Myw1MC44MywwLDAsMCw1NSwxMDkuMDdhNTguODgsNTguODgsMCwwLDAsMTEuNzMtMS4yMkE1OS4zOSw1OS4zOSwwLDAsMCw3Ni44OCwxMDVsMi41OCwxMmEzNC4yNywzNC4yNywwLDAsMS0xMS42LDQuNDQsNjMuNzQsNjMuNzQsMCwwLDEtMTMuMTMsMS40NXEtMTcuOTEsMC0zMC40LTYuNjNhNDIuNTYsNDIuNTYsMCwwLDEtMTguNzUtMjBRLS42NSw4Mi45NS4wOCw2Mi45M0E3OS40OCw3OS40OCwwLDAsMSw1LDM3LjkzYTYyLjQxLDYyLjQxLDAsMCwxLDEyLjA3LTIwQTUzLjYsNTMuNiwwLDAsMSwzNS41LDQuNzIsNTguNzksNTguNzksMCwwLDEsNTkuNDIsMHExNy40LDAsMjkuMzUsNy4xMWE0NC4yOSw0NC4yOSwwLDAsMSwxNy45LDE5LjcycTUuODgsMTIuNjIsNS4xOSwyOS4xNUE2My40Miw2My40MiwwLDAsMSwxMDkuNzYsNzBhNDEuNDksNDEuNDksMCwwLDEtNS40NCwxMi4zMiwyNy44OSwyNy44OSwwLDAsMS05LjIzLDguNzMsMjYuNjgsMjYuNjgsMCwwLDEtMTMuNDUsMy4yNSwxOC41NiwxOC41NiwwLDAsMS0xMy43Ni01LjUxLDE2LjE4LDE2LjE4LDAsMCwxLTIuMzEtM1onLz48L3N2Zz4=" />
            </a>
            <a href='https://linktr.ee/lucashanson' target='_blank' rel='noreferrer'>
              <img src="https://img.shields.io/badge/Linktree-00A79D?logo=linktree&logoColor=white" />
            </a>
          </div>
        </div>
      </footer>
      <footer className='common-container'>
        <div className='inner-container'>
          <p>
            Built using React and hosted trough GitHub Pages<br/>
            © Lucas Hanson {new Date().getFullYear()}<br/>
            <a href='https://github.com/lucasfth/portfolio' target='_blank' rel='noreferrer'>GitHub repository</a>
          </p></div>
      </footer>
    </>
  );
}

export default Footer;
