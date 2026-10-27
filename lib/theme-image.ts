export interface ThemeImageSources {
  image?: string;
  imageLight?: string;
  imageDark?: string;
}

/** A lone source works in both themes; explicit variants win over the base. */
export function resolveThemeImage({ image, imageLight, imageDark }: ThemeImageSources) {
  return {
    light: imageLight || image || imageDark,
    dark: imageDark || image || imageLight,
  };
}
