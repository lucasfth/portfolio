![header](/images/nature/DSCF2082.jpg)

# 🌄 Downsizing images

Due to using original images on my website, I wanted to ensure no one uses my images without permission. Thus I found [this quora post](https://www.quora.com/Where-is-a-great-place-to-share-your-photography-without-the-risk-of-people-stealing-it) that suggests downsizing images.

--- 

## Pains

When downsizing the images I quickly found it tideous to do it manually.
I had to open each image in an editor and resize it to a smaller size.
This was not only time-consuming but also error-prone.

Thus I wanted to more or less automate this process.
The easiest way I found was to create a simple bash script that uses `imagemagick` to resize the images.

## Solution

The script was quite simple.
First `imagemagick` had to be installed - e.g. by using homebrew on macOS.

```bash
brew install imagemagick
```

My script then creates a folder for the downsized images named `resized` and then resizes all the images to have a height of 720 pixels.

```bash
mkdir resized

for img in *.jpg *.JPG *.png *.PNG; do
    magick "$img" -resize x720\> "resized/$img"
done
```

## Improvements and issues

Right now it quite simply just down scales the image based on its height.
A better approach might have been to downscale based on its longest side.
This would generate a more consistent image size, in terms of pixels.

Now for the issues.
Due to the capabilities of machine learning it might be possible to upscale the images quite easily.
This would make the downsizing process obsolete and thus the images would be easy to use without permission.
I have not yet found a solution to this issue, but I believe giving the images some kind of metadata watermark might be a solution to this issue.
This idea is inspired by a [youtube video](https://www.youtube.com/watch?v=NEDFUjqA1s8&t=722s) I watched.
It could make it so the machine learning model provides incorrect pixel values for the image, thus making it unusable.

But this is just a thought and I have not yet implemented it.
