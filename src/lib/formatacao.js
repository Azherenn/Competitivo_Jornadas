// Padroniza nomes de pokémon, golpes e itens em Capitalizado
// (ex: "garchomp" -> "Garchomp", "STONE edge" -> "Stone Edge").
// Usado em todo o app pra garantir que o mesmo pokémon nunca fique
// salvo de formas diferentes (o que fragmentaria as estatísticas
// de meta automático e o histórico).
export function capitalizar(texto) {
  if (!texto) return texto
  return texto
    .trim()
    .split(/\s+/)
    .map((palavra) =>
      palavra
        .split('-')
        .map((parte) => (parte ? parte[0].toUpperCase() + parte.slice(1).toLowerCase() : parte))
        .join('-')
    )
    .join(' ')
}
