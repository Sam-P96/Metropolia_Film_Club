import {useEffect, useRef, useState } from 'react'

function useInView(threshold = 0.7) {
    const ref = useRef(null)
    const [inView, setInView] = useState(false)

    useEffect(() => {
        const element = ref.current
        if (!element) return 
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setInView(true)
                        observer.disconnect()
                    }
                },
                {threshold}
            )

        observer.observe(element)
        return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}

export default useInView