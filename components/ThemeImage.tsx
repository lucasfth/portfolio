import Image, { getImageProps, type ImageProps } from "next/image";
import { resolveThemeImage, type ThemeImageSources } from "@/lib/theme-image";

type Props = Omit<ImageProps, "src"> & ThemeImageSources;

/** Native picture selection follows the same media query as the site palette. */
export default function ThemeImage({ image, imageLight, imageDark, ...props }: Props) {
  const { light, dark } = resolveThemeImage({ image, imageLight, imageDark });
  if (!dark) return null;
  if (light === dark) return <Image {...props} src={dark} />;
  const { props: lightProps } = getImageProps({ ...props, src: light! });
  const { props: darkProps } = getImageProps({ ...props, src: dark });
  return (
    <picture>
      <source media="(prefers-color-scheme: light)" srcSet={lightProps.srcSet || lightProps.src} sizes={lightProps.sizes} />
      <img {...darkProps} alt={props.alt} />
    </picture>
  );
}
