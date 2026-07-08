import { ref, type Ref } from 'vue'

const FONTE_MIN = 14
const FONTE_MAX = 24
const FONTE_PADRAO = 16

const tamanhoFonte: Ref<number> = ref(FONTE_PADRAO)

export function useAcessibilidade() {
  /**
   * Cancela fala anterior antes de iniciar nova para evitar
   * sobreposição de áudio no TTS (Web Speech API).
   */
  function lerTexto(texto: string): void {
    if (!window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(texto)
    utterance.lang = 'pt-BR'
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    window.speechSynthesis.speak(utterance)
  }

  /**
   * Alterna entre os valores 'light' e 'dark' do atributo
   * data-bs-theme no <html>, mecanismo nativo do Bootstrap 5.3+
   * para alternância de temas claro/escuro.
   */
  function alternarContraste(): void {
    const html = document.documentElement
    const temaAtual = html.getAttribute('data-bs-theme')
    html.setAttribute('data-bs-theme', temaAtual === 'dark' ? 'light' : 'dark')
  }

  /**
   * Aplica o novo valor ao style.fontSize do <html>.
   * A escala em rem propaga a alteração para toda a interface
   * sem necessidade de recalcular breakpoints ou paddings.
   */
  function aumentarFonte(): void {
    const novo = Math.min(tamanhoFonte.value + 2, FONTE_MAX)
    tamanhoFonte.value = novo
    document.documentElement.style.fontSize = `${novo}px`
  }

  function diminuirFonte(): void {
    const novo = Math.max(tamanhoFonte.value - 2, FONTE_MIN)
    tamanhoFonte.value = novo
    document.documentElement.style.fontSize = `${novo}px`
  }

  return {
    tamanhoFonte,
    lerTexto,
    alternarContraste,
    aumentarFonte,
    diminuirFonte,
  }
}
