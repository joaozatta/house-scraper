import main from './index'

main().catch((error) => {
  console.error('Erro na execução do script:', error)
  process.exit(1)
})
