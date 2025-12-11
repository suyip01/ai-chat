export type PublishedCharacter = {
  id: string | number;
  name?: string;
  avatar?: string;
  profileImage?: string;
  bio?: string;
  tags?: string[];
  creator?: string;
  oneLinePersona?: string;
  personality?: string;
  profession?: string;
  age?: string;
  roleType?: string;
  currentRelationship?: string;
  plotTheme?: string;
  plotDescription?: string;
  openingLine?: string;
  created_at?: number | string;
};

const toCharacter = (item: any): PublishedCharacter => ({
  id: item?.id ?? item?._id ?? item?.character_id ?? String(Date.now()),
  name: item?.name ?? item?.title ?? '',
  avatar: item?.avatar ?? item?.cover ?? item?.image ?? '',
  profileImage: item?.profileImage ?? item?.banner ?? item?.image ?? '',
  bio: item?.bio ?? item?.tagline ?? item?.description ?? '',
  tags: item?.tags ?? item?.keywords ?? [],
  creator: item?.creator ?? item?.author ?? '',
  oneLinePersona: item?.oneLinePersona ?? item?.tagline ?? '',
  personality: item?.personality ?? item?.personality ?? '',
  profession: item?.profession ?? item?.occupation ?? '',
  age: item?.age ?? '',
  roleType: item?.roleType ?? item?.character_type ?? '',
  currentRelationship: item?.currentRelationship ?? item?.relationship ?? '',
  plotTheme: item?.plotTheme ?? item?.plot_theme ?? '',
  plotDescription: item?.plotDescription ?? item?.plot_summary ?? '',
  openingLine: item?.openingLine ?? item?.opening_line ?? '',
  created_at: item?.created_at ?? 0,
});

export const listCharacters = async (params?: { tag?: string; limit?: number; offset?: number }) => {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set('tag', params.tag);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));
  const { authFetch } = await import('./http')
  const res = await authFetch(`/characters/?${qs.toString()}`)
  if (!res.ok) throw new Error('failed');
  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  items.sort((a, b) => Number(b?.created_at || 0) - Number(a?.created_at || 0));
  return items.map(toCharacter);
};

export const getCharacter = async (id: string | number) => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/characters/${id}`)
  if (!res.ok) throw new Error('failed');
  const data = await res.json();
  return toCharacter(data);
};
