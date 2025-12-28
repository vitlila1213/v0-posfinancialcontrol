export const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    console.log("[v0] resizeImage iniciado para:", file.name, file.size, file.type)

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      console.log("[v0] Imagem carregada:", img.width, "x", img.height)

      try {
        const canvas = document.createElement("canvas")
        const MAX_WIDTH = 800
        const scaleSize = MAX_WIDTH / img.width
        canvas.width = MAX_WIDTH
        canvas.height = img.height * scaleSize

        console.log("[v0] Canvas criado:", canvas.width, "x", canvas.height)

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error("Não foi possível criar contexto do canvas"))
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        console.log("[v0] Imagem desenhada no canvas")

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)

            if (!blob) {
              reject(new Error("Não foi possível criar blob"))
              return
            }

            console.log("[v0] Blob criado:", blob.size)
            const resizedFile = new File([blob], "foto.jpg", { type: "image/jpeg" })
            console.log("[v0] Arquivo final:", resizedFile.size)
            resolve(resizedFile)
          },
          "image/jpeg",
          0.7,
        )
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        console.error("[v0] Erro no processamento:", error)
        reject(error)
      }
    }

    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl)
      console.error("[v0] Erro ao carregar imagem:", error)
      reject(new Error("Erro ao carregar imagem"))
    }

    img.src = objectUrl
  })
}
