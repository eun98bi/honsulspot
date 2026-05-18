"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { fetchBars, fetchTopTagsByBar, getBarRegion, type BarRow } from "@/lib/db";
import { HonsulMode, modeConfig } from "@/lib/data";
import BarCard from "@/components/BarCard";
import BarDetail from "@/components/BarDetail";
import CoupangBanner from "@/components/CoupangBanner";
import styles from "./page.module.css";

const KakaoMap = dynamic(() => import("@/components/KakaoMap"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "#0F0E0B" }} />,
});

type ModeFilter = HonsulMode | "all";

const ITEMS_PER_PAGE = 10;

export default function HomePage() {
  const [allBars, setAllBars] = useState<BarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [regionFilter, setRegionFilter] = useState("전체");
  const [districtFilter, setDistrictFilter] = useState("전체");
  const [selectedBar, setSelectedBar] = useState<BarRow | null>(null);
  const [detailBar, setDetailBar] = useState<BarRow | null>(null);
  const [mobileTagsOpen, setMobileTagsOpen] = useState(false);
  const [topTagsByBar, setTopTagsByBar] = useState<Record<string, string[]>>({});
  const [regionOpen, setRegionOpen] = useState(true);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBars().then(setAllBars).finally(() => setLoading(false));
    fetchTopTagsByBar().then(setTopTagsByBar);
  }, []);

  const regions = useMemo(
    () => Array.from(new Set(allBars.map((bar) => getBarRegion(bar)).filter(Boolean))).sort(),
    [allBars],
  );

  const districts = useMemo(() => {
    const scopedBars = regionFilter === "전체"
      ? allBars
      : allBars.filter((bar) => getBarRegion(bar) === regionFilter);

    return Array.from(new Set(scopedBars.flatMap((bar) => bar.districts ?? []).filter(Boolean))).sort();
  }, [allBars, regionFilter]);

  useEffect(() => {
    if (districtFilter !== "전체" && !districts.includes(districtFilter)) {
      setDistrictFilter("전체");
    }
  }, [districtFilter, districts]);

  const filtered = useMemo(() => {
    return allBars.filter((bar) => {
      if (modeFilter !== "all" && bar.mode !== modeFilter) return false;
      if (regionFilter !== "전체" && getBarRegion(bar) !== regionFilter) return false;
      if (districtFilter !== "전체" && !bar.districts?.includes(districtFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!bar.name.toLowerCase().includes(q) && !bar.address.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allBars, modeFilter, regionFilter, districtFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [modeFilter, regionFilter, districtFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedBars = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getPageRange = (current: number, total: number, maxVisible = 5) => {
    if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1);
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, current - half);
    const end = Math.min(total, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const resetSelection = () => {
    setSelectedBar(null);
    setDetailBar(null);
  };

  const handleSelectBar = (bar: BarRow) => {
    setSelectedBar(bar);
    setDetailBar(null);
    const barIndex = filtered.indexOf(bar);
    if (barIndex !== -1) {
      setCurrentPage(Math.floor(barIndex / ITEMS_PER_PAGE) + 1);
    }
    setTimeout(() => {
      document.getElementById(`bar-card-${bar.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const handleViewDetail = (bar: BarRow) => {
    setSelectedBar(bar);
    setDetailBar(bar);
  };

  const handleListBlankClick = (event: MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) {
      resetSelection();
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>🍶</span>
          <span className={styles.logoText}>혼술스팟</span>
        </Link>
        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="바 이름 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.searchClear} onClick={() => setSearchQuery("")} type="button" aria-label="검색어 지우기">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.headerActions}>
          <Link href="/community" className={styles.communityBtn}>커뮤니티</Link>
          <Link href="/contact?type=info" className={styles.headerBtn}>정보 수정 문의</Link>
          <Link href="/contact?type=ad" className={styles.headerBtn}>광고 문의</Link>
        </div>
      </header>

      <div className={styles.main}>
        <div className={styles.filtersWrapper}>
          <button
            className={styles.mobileTagsToggle}
            onClick={() => setMobileTagsOpen((open) => !open)}
            type="button"
          >
            <span>필터</span>
            <span className={`${styles.toggleArrow} ${mobileTagsOpen ? styles.toggleOpen : ""}`}>▾</span>
          </button>

          <div className={`${styles.filters} ${mobileTagsOpen ? styles.filtersOpen : ""}`}>
            {/* 지역 토글 */}
            <button
              className={styles.filterToggleRow}
              onClick={() => setRegionOpen((o) => !o)}
              type="button"
            >
              <span className={styles.filterLabel}>지역</span>
              <span className={styles.filterToggleRight}>
                <span className={`${styles.filterSelectedBadge} ${regionFilter !== "전체" ? styles.filterSelectedActive : ""}`}>
                  {regionFilter}
                </span>
                <span className={`${styles.filterToggleArrow} ${regionOpen ? styles.filterToggleArrowOpen : ""}`}>▾</span>
              </span>
            </button>
            {regionOpen && (
              <div className={styles.filterGroup}>
                {["전체", ...regions].map((region) => (
                  <button
                    key={region}
                    className={`${styles.pill} ${regionFilter === region ? styles.pillActive : ""}`}
                    onClick={() => {
                      setRegionFilter(region);
                      setDistrictFilter("전체");
                      resetSelection();
                      setRegionOpen(false);
                      setDistrictOpen(region !== "전체");
                    }}
                    type="button"
                  >
                    {region}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.filterDivider} />

            {/* 동네 토글 */}
            <button
              className={styles.filterToggleRow}
              onClick={() => setDistrictOpen((o) => !o)}
              type="button"
            >
              <span className={styles.filterLabel}>동네</span>
              <span className={styles.filterToggleRight}>
                <span className={`${styles.filterSelectedBadge} ${districtFilter !== "전체" ? styles.filterSelectedActive : ""}`}>
                  {districtFilter}
                </span>
                <span className={`${styles.filterToggleArrow} ${districtOpen ? styles.filterToggleArrowOpen : ""}`}>▾</span>
              </span>
            </button>
            {districtOpen && (
              <div className={styles.filterGroup}>
                {["전체", ...districts].map((district) => (
                  <button
                    key={district}
                    className={`${styles.pill} ${districtFilter === district ? styles.pillActive : ""}`}
                    onClick={() => {
                      setDistrictFilter(district);
                      resetSelection();
                      setDistrictOpen(false);
                    }}
                    type="button"
                  >
                    {district}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.filterDivider} />

            <div className={styles.filterLabel}>혼술 모드</div>
            <div className={styles.filterGroup}>
              <button
                className={`${styles.pill} ${modeFilter === "all" ? styles.pillActive : ""}`}
                onClick={() => setModeFilter("all")}
                type="button"
              >
                전체
              </button>
              {(["quiet", "social", "mixed"] as HonsulMode[]).map((mode) => {
                const cfg = modeConfig[mode];
                return (
                  <button
                    key={mode}
                    className={`${styles.pill} ${modeFilter === mode ? styles.pillActive : ""}`}
                    style={modeFilter === mode ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
                    onClick={() => setModeFilter(mode)}
                    type="button"
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`${styles.mapArea} ${detailBar ? styles.mapAreaDetail : ""}`}>
          <div className={styles.mapKakao}>
            {detailBar ? (
              <BarDetail bar={detailBar} onClose={() => setDetailBar(null)} />
            ) : (
              <KakaoMap bars={filtered} selectedBar={selectedBar} onSelectBar={handleViewDetail} />
            )}
          </div>
          {!detailBar && (
            <div className={styles.mapAdSlot}>
              <CoupangBanner />
            </div>
          )}
        </div>

        {!detailBar && (
          <div className={styles.mobileAdSlot}>
            <CoupangBanner />
          </div>
        )}

        <div className={styles.listWrapper} ref={listRef} onClick={handleListBlankClick}>
          <p className={styles.resultCount}>
            {regionFilter !== "전체" && <span className={styles.resultDistrict}>{regionFilter}</span>}
            {regionFilter !== "전체" && districtFilter !== "전체" && <span className={styles.resultDivider}> · </span>}
            {districtFilter !== "전체" && <span className={styles.resultDistrict}>{districtFilter}</span>}
            {(regionFilter !== "전체" || districtFilter !== "전체") && <span className={styles.resultDivider}> · </span>}
            {loading ? "불러오는 중..." : `${filtered.length}개의 혼술 바`}
          </p>
          <div className={styles.list} onClick={handleListBlankClick}>
            {loading ? (
              <div className={styles.empty}>
                <p>로딩 중</p>
                <p className={styles.emptySub}>혼술 바 목록을 불러오고 있어요.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>
                <p>조건에 맞는 바가 없어요.</p>
                <p className={styles.emptySub}>필터를 조금 넓혀보세요.</p>
              </div>
            ) : (
              paginatedBars.map((bar) => (
                <BarCard
                  key={bar.id}
                  bar={bar}
                  topTags={topTagsByBar[bar.id] ?? bar.tags?.slice(0, 3) ?? []}
                  selected={selectedBar?.id === bar.id}
                  onClick={() => handleSelectBar(bar)}
                  onViewDetail={() => handleViewDetail(bar)}
                />
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                type="button"
              >
                이전
              </button>
              {currentPage > 3 && totalPages > 5 && (
                <>
                  <button className={styles.pageBtn} onClick={() => handlePageChange(1)} type="button">1</button>
                  {currentPage > 4 && <span className={styles.pageEllipsis}>…</span>}
                </>
              )}
              {getPageRange(currentPage, totalPages).map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ""}`}
                  onClick={() => handlePageChange(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
              {currentPage < totalPages - 2 && totalPages > 5 && (
                <>
                  {currentPage < totalPages - 3 && <span className={styles.pageEllipsis}>…</span>}
                  <button className={styles.pageBtn} onClick={() => handlePageChange(totalPages)} type="button">{totalPages}</button>
                </>
              )}
              <button
                className={styles.pageBtn}
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                type="button"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
