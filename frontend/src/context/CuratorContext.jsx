import { createContext, useContext } from 'react'

export const CuratorContext = createContext({ curatorPin: null, setCuratorPin: () => {} })

export const useCurator = () => useContext(CuratorContext)
