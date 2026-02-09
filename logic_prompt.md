
# Prompt: Lógica Anti-Duplicados para Sistemas de Prospección

Copia y pega este prompt cuando quieras que un AI implemente la lógica de "Nunca Repetir Leads" en tus proyectos.

---

**CONTEXTO:**
Estoy construyendo un sistema de generación de leads y necesito una regla estricta para evitar duplicados.

**REGLA DE ORO:**
"Un lead nunca debe ser procesado ni entregado si ya existe en la base de datos histórica del usuario, independientemente de la búsqueda actual".

**INSTRUCCIONES DE IMPLEMENTACIÓN:**

1.  **Fase de Pre-Vuelo (Pre-Flight):**
    *   Antes de iniciar cualquier loop de scraping o búsqueda, haz una consulta a la base de datos (Supabase/Firebase/SQL).
    *   Descarga TODOS los dominios (`website`) y nombres de empresas (`companyName`) que este usuario ya tiene guardados en su historial.
    *   Guárdalos en un `Set` en memoria (ej: `existingWebsites`).

2.  **Fase de Filtrado (In-Loop):**
    *   Dentro del bucle de generación, cada vez que obtengas un candidato (raw lead), compáralo con el `Set`.
    *   Normaliza los datos (minusculas, quitar `https://`, `www.`, `/`) antes de comparar.
    *   **SI** el dominio o nombre existe en el `Set` -> **DESCÁRTALO INMEDIATAMENTE**. No gastes créditos de API enriqueciéndolo.
    *   **NO** lo cuentes como un resultado válido.

3.  **Fase de Guardado:**
    *   Solo guarda en la base de datos los leads que pasaron este filtro.

**SNIPPET DE CÓDIGO (Ejemplo TypeScript/Supabase):**

```typescript
// 1. Fetch History
const { data } = await supabase.from('leads').select('website').eq('user_id', userId);
const tabooSet = new Set(data.map(d => cleanUrl(d.website)));

// 2. Filter Loop
const candidates = await scrapeLeads(query);
const uniqueCandidates = candidates.filter(c => !tabooSet.has(cleanUrl(c.website)));

// 3. Process Only Unique
processLeads(uniqueCandidates);
```

**OBJETIVO:** Garantizar con 100% de certeza que el cliente nunca paga ni ve el mismo lead dos veces.
