/** Shrink a photo before sharing it, so posts stay small. Returns a JPEG data URL. */
export function shrinkPhoto(file: File, maxSide = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(image.src);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    image.onerror = () => reject(new Error("That photo couldn't be opened. Try another one."));
    image.src = URL.createObjectURL(file);
  });
}
