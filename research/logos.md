# Logo and wordmark library (`public/logos`)

Every file is sourced artwork from Wikimedia (en.wikipedia.org / commons.wikimedia.org), cleaned and rasterized, never redrawn:
SVG originals are rendered with resvg (straight alpha, no matte), trimmed to the artwork bounds, edge pixels are colour-bled from the nearest
solid pixel (no dark/white halos, checked on dark and light backgrounds) and saved as PNG (long side ~1024 px).
Where upload.wikimedia.org rate-limited the download of the original SVG, the MediaWiki-rendered PNG of the same SVG (`thumb.php`) was used (column "render").
Stacked wordmarks (e.g. CINCINNATI / BENGALS) are also provided split into `_word_city` and `_word_name` lines (cropped from the same artwork).
The app loads `public/logos/<KEY>.png`; `KEY@#hex` tints a mark one colour at runtime (use it on one-colour wordmarks).

## Licensing

- `Public domain [trademarked]` = Commons/Wikipedia tag PD-textlogo (below the threshold of originality). The marks remain trademarks of the NFL and its clubs.
- `Fair use (non-free)` = the logo is hosted on en.wikipedia under a non-free-use rationale (not freely licensed). Used here for a non-commercial, educational uniform viewer.
- `CC BY-SA 4.0` / `CC0` = freely licensed files (attribution/share-alike applies for BY-SA).
- Marks cut from the Commons NFL uniform sheets are labelled `cut from uniform sheet` (or `recut from full-size uniform sheet`). The sheets are CC BY 4.0 or CC BY-SA 4.0 (credit the sheet's Commons page; an earlier version of this file called them CC0), and the marks on them remain trademarks.

## Files

| file | team | mark | worn on | size | render | source | license | main colours |
|---|---|---|---|---|---|---|---|---|
| `BUF.png` | Bills | primary logo | helmet; sleeve (Nickel City alt); pants hip | 1024x683 | svg | en:File:Buffalo_Bills_logo.svg | Fair use (non-free) | #0C3C84 #CC0C3C #FCFCFC |
| `BUF_classic.png` | Bills | classic standing buffalo (1962-73) | red throwback helmet | 1024x753 | thumb.php | commons:File:Buffalo_Bills_classic_logo.svg | Public domain | #CC0C3C |
| `BUF_word.png` | Bills | BILLS wordmark | chest above number (home/road) | 1023x263 | svg | commons:File:Buffalo_Bills_wordmark.svg | Public domain [trademarked] | #0C3C84 |
| `MIA.png` | Dolphins | primary logo | helmet; sleeve | 1017x803 | svg | en:File:Miami_Dolphins_logo.svg | Fair use (non-free) | #FCFCFC #0C849C #FC540C |
| `MIA_tb.png` | Dolphins | 1966 throwback dolphin in sunburst | throwback helmet | 118x140 | cut from uniform sheet | commons:File:Miami_Dolphins_Uniforms_2025.png | CC BY-SA 4.0 (uniform sheet); mark itself trademarked | #FCFCFC #0C6C84 #E46C24 |
| `MIA_word.png` | Dolphins | MIAMI over "Dolphins" script | chest ("Dolphins" script), collar (MIAMI) | 1017x273 | svg | commons:File:Miami_Dolphins_wordmark.svg | Public domain [trademarked] | #0C9C9C #FC540C |
| `MIA_word_city.png` | Dolphins | city line of the MIA wordmark | chest ("Dolphins" script), collar (MIAMI) | 421x63 | svg | commons:File:Miami_Dolphins_wordmark.svg | Public domain [trademarked] | #FC540C |
| `MIA_word_name.png` | Dolphins | name line of the MIA wordmark | chest ("Dolphins" script), collar (MIAMI) | 1017x198 | svg | commons:File:Miami_Dolphins_wordmark.svg | Public domain [trademarked] | #0C9C9C |
| `NE.png` | Patriots | primary logo | helmet (Flying Elvis); sleeve | 1014x490 | svg | en:File:New_England_Patriots_logo.svg | Fair use (non-free) | #0C243C #FCFCFC #CC0C3C #B4B4B4 |
| `NE_ne.png` | Patriots | NE (with star) monogram | Rivalries 'Nor'easter' sleeves | 496x362 | raster | commons:File:New_England_Patriots_NE_logo.png | Public domain [trademarked] | #0C243C |
| `NE_pat.png` | Patriots | Pat Patriot (1961-92) | throwback helmet; sleeves of the red throwback | 1024x1024 | svg | en:File:New_England_Patriots_logo_old.svg | Fair use (non-free) | #243C84 #FCFCFC #E4243C |
| `NE_word.png` | Patriots | PATRIOTS wordmark | chest, collar | 1014x236 | thumb.php | commons:File:New_England_Patriots_wordmark.svg | Public domain [trademarked] | #0C243C |
| `NYJ.png` | Jets | primary logo | helmet (via NYJ_word); chest (Rivalries) | 1024x612 | svg | commons:File:New_York_Jets_2024.svg | Public domain [trademarked] | #0C543C #FCFCFC |
| `NYJ_1978.png` | Jets | JETS wordmark with swoosh (1978-97) | throwback helmet / chest | 1024x311 | thumb.php | commons:File:New_York_Jets_logo_(1978%E2%80%931997).svg | Public domain [trademarked] | #3C6C54 |
| `NYJ_classic.png` | Jets | classic JETS oval | throwback helmet | 310x174 | cut from uniform sheet | commons:File:New_York_Jets_Uniforms_(2026).png | CC BY 4.0 (uniform sheet); mark itself trademarked | #246C3C #FCFCFC |
| `NYJ_plane.png` | Jets | Gotham diamond-plate JETS oval | Rivalries chest | 185x111 | cut from uniform sheet | commons:File:New_York_Jets_Uniforms_(2026).png | CC BY 4.0 (uniform sheet); mark itself trademarked | #242424 #CCCCCC |
| `NYJ_word.png` | Jets | JETS italic wordmark with swoosh tail (2024) | helmet; chest (Rivalries) | 1024x322 | thumb.php | commons:File:New_York_Jets_2024_(wordmark).svg | Public domain [trademarked] | #0C543C |
| `NYJ_word_plain.png` | Jets | JETS italic wordmark, plain | alt helmet / chest | 1024x194 | thumb.php | commons:File:New_York_Jets_wordmark.svg | Public domain [trademarked] | #0C543C |
| `BAL.png` | Ravens | primary logo | helmet; sleeve (shield patch) | 996x482 | svg | en:File:Baltimore_Ravens_logo.svg | Fair use (non-free) | #0C0C0C #FCFCFC #240C54 #9C6C0C |
| `BAL_dark.png` | Ravens | Darkness raven head | Darkness helmet | 231x292 | cut from uniform sheet | commons:File:Baltimore_Ravens_Uniforms_(2026).png | see sheet page (unverified) (uniform sheet); mark itself trademarked | #0C0C0C #545454 |
| `BAL_word.png` | Ravens | BALTIMORE / RAVENS wordmark | chest above number, collar | 1012x199 | svg | commons:File:Baltimore_Ravens_wordmark.svg | Public domain [trademarked] | #0C0C0C #6C540C |
| `BAL_word_city.png` | Ravens | city line of the BAL wordmark | chest above number, collar | 616x32 | svg | commons:File:Baltimore_Ravens_wordmark.svg | Public domain [trademarked] | #0C0C0C |
| `BAL_word_name.png` | Ravens | name line of the BAL wordmark | chest above number, collar | 1012x142 | svg | commons:File:Baltimore_Ravens_wordmark.svg | Public domain [trademarked] | #0C0C0C #6C540C |
| `CIN.png` | Bengals | primary logo | helmet (B logo, Bengals wear tiger stripes instead); sleeve | 1024x719 | svg | commons:File:Cincinnati_Bengals_logo.svg | Public domain [trademarked] | #FC540C #0C0C0C #FCFCFC |
| `CIN_word.png` | Bengals | CINCINNATI / BENGALS wordmark | chest above number | 1023x170 | thumb.php | commons:File:Cincinnati_Bengals_wordmark.svg | Public domain [trademarked] | #0C0C0C #FC5424 |
| `CIN_word_city.png` | Bengals | city line of the CIN wordmark | chest above number | 618x42 | thumb.php | commons:File:Cincinnati_Bengals_wordmark.svg | Public domain [trademarked] | #FC5424 |
| `CIN_word_name.png` | Bengals | name line of the CIN wordmark | chest above number | 1023x92 | thumb.php | commons:File:Cincinnati_Bengals_wordmark.svg | Public domain [trademarked] | #0C0C0C |
| `CLE.png` | Browns | primary logo | helmet logo (orange helmet mark); sleeve | 1023x778 | svg | en:File:Cleveland_Browns_logo.svg | Fair use (non-free) | #FC3C0C #FCFCFC #3C240C |
| `CLE_elf.png` | Browns | Brownie the Elf | throwback sleeve / alternate | 147x168 | raster | en:File:Brownie_Elf_logo.png | Fair use (non-free) | #3C2424 #E45424 |
| `CLE_word.png` | Browns | CLEVELAND / BROWNS wordmark | chest above number | 1003x457 | svg | commons:File:Cleveland_Browns_wordmark.svg | Public domain [trademarked] | #FC3C0C |
| `CLE_word_city.png` | Browns | city line of the CLE wordmark | chest above number | 1003x192 | svg | commons:File:Cleveland_Browns_wordmark.svg | Public domain [trademarked] | #FC3C0C |
| `CLE_word_name.png` | Browns | name line of the CLE wordmark | chest above number | 1003x247 | svg | commons:File:Cleveland_Browns_wordmark.svg | Public domain [trademarked] | #FC3C0C |
| `PIT.png` | Steelers | primary logo | helmet (steelmark inside ring); chest/sleeve | 999x998 | svg | commons:File:Pittsburgh_Steelers_logo.svg | Public domain [trademarked] | #FCFCFC #9CB4B4 |
| `PIT_crest.png` | Steelers | 1933 crest | 1933 throwback chest | 108x123 | cut from uniform sheet | commons:File:Pittsburgh_Steelers_Uniforms_2025.png | CC BY-SA 4.0 (uniform sheet); mark itself trademarked | #E4E4E4 #24240C #846C24 #848484 |
| `PIT_word.png` | Steelers | Steelers bold wordmark | not worn on the 2026 jersey; helmet/sleeve alt use | 984x273 | thumb.php | commons:File:Pittsburgh_Steelers_Script.svg | Public domain [trademarked] | #0C0C0C |
| `HOU.png` | Texans | primary logo | helmet; sleeve; pants hip | 1024x934 | svg | en:File:Houston_Texans_logo.svg | Fair use (non-free) | #0C0C24 #FCFCFC #E40C24 |
| `HOU_word.png` | Texans | HOUSTON / TEXANS wordmark | chest above number | 1013x155 | thumb.php | commons:File:Houston_Texans_wordmark.svg | Public domain [trademarked] | #0C2424 #B4243C |
| `HOU_word_city.png` | Texans | city line of the HOU wordmark | chest above number | 479x36 | thumb.php | commons:File:Houston_Texans_wordmark.svg | Public domain [trademarked] | #B4243C |
| `HOU_word_name.png` | Texans | name line of the HOU wordmark | chest above number | 1013x97 | thumb.php | commons:File:Houston_Texans_wordmark.svg | Public domain [trademarked] | #0C2424 |
| `IND.png` | Colts | primary logo | helmet; sleeve | 1007x1059 | svg | commons:File:Indianapolis_Colts_logo.svg | Public domain [trademarked] | #0C3C6C #FCFCFC |
| `IND_word.png` | Colts | COLTS wordmark (current) | chest / back collar | 1003x249 | thumb.php | commons:File:Indianapolis_Colts_new_wordmark.svg | Public domain [trademarked] | #0C3C6C |
| `JAX.png` | Jaguars | primary logo | helmet; chest; sleeve | 1014x759 | svg | en:File:Jacksonville_Jaguars_logo.svg | Fair use (non-free) | #0C0C0C #FCFCFC #9C8424 #E49C24 |
| `JAX_tb.png` | Jaguars | 1995 Prowler jaguar | throwback helmet / sleeve | 291x236 | cut from uniform sheet | commons:File:Jacksonville_Jaguars_Uniforms_(2026).png | CC BY 4.0 (uniform sheet); mark itself trademarked | #CC9C3C #0C0C0C #FCFCFC #0C6C84 |
| `JAX_word.png` | Jaguars | JACKSONVILLE / JAGUARS wordmark | chest above number | 1023x345 | svg | commons:File:Jacksonville_Jaguars_wordmark.svg | Public domain [trademarked] | #0C0C0C #9C8424 |
| `JAX_word_city.png` | Jaguars | city line of the JAX wordmark | chest above number | 782x76 | svg | commons:File:Jacksonville_Jaguars_wordmark.svg | Public domain [trademarked] | #9C8424 |
| `JAX_word_name.png` | Jaguars | name line of the JAX wordmark | chest above number | 1023x228 | svg | commons:File:Jacksonville_Jaguars_wordmark.svg | Public domain [trademarked] | #0C0C0C |
| `TEN.png` | Titans | primary logo | helmet; sleeve | 1024x1024 | svg | en:File:Tennessee_Titans_Logo_2026.svg | Fair use (non-free) | #3C9CCC #FCFCFC #CC0C0C |
| `TEN_word.png` | Titans | TENNESSEE / TITANS wordmark | chest above number | 1015x367 | svg | commons:File:Tennessee_Titans_wordmark.svg | Public domain [trademarked] | #0C243C #549CE4 #245484 #3C6CB4 |
| `DEN.png` | Broncos | primary logo | helmet; sleeve | 1013x594 | svg | en:File:Denver_Broncos_logo.svg | Fair use (non-free) | #FCFCFC #0C243C #FC540C |
| `DEN_tb.png` | Broncos | classic D with bucking horse | throwback helmet / sleeve | 129x133 | recut from full-size uniform sheet | commons:File:Denver_Broncos_Uniforms_2024-Present.png | CC BY-SA 4.0 (uniform sheet); mark itself trademarked | #FC540C #FCFCFC |
| `DEN_word.png` | Broncos | BRONCOS / DENVER wordmark | chest above number | 1024x177 | thumb.php | commons:File:Denver_Broncos_wordmark.svg | Public domain [trademarked] | #0C243C |
| `DEN_word_city.png` | Broncos | city line of the DEN wordmark | chest above number | 430x29 | thumb.php | commons:File:Denver_Broncos_wordmark.svg | Public domain [trademarked] | #FC540C |
| `DEN_word_name.png` | Broncos | name line of the DEN wordmark | chest above number | 1024x117 | thumb.php | commons:File:Denver_Broncos_wordmark.svg | Public domain [trademarked] | #0C243C |
| `KC.png` | Chiefs | primary logo | helmet; sleeve | 1012x640 | svg | commons:File:Kansas_City_Chiefs_logo.svg | Public domain [trademarked] | #FCFCFC #0C0C0C #E4243C |
| `KC_LH.png` | Chiefs | Lamar Hunt memorial patch | jersey chest (Home, Road) | 636x636 | raster |  | Licensed by the project owner (user-supplied artwork, 2026-10-08) | #A71930 #F2E3B6 #0033A0 |
| `KC_kc.png` | Chiefs | KC monogram | sleeve / alternate | 944x608 | svg | commons:File:Kansas_City_Chiefs_KC_logo.svg | Public domain [trademarked] | #B40C3C #0C0C0C |
| `KC_word.png` | Chiefs | CHIEFS wordmark | chest above number | 1017x223 | svg | commons:File:Kansas_City_Chiefs_wordmark.svg | Public domain [trademarked] | #E4243C |
| `LV.png` | Raiders | primary logo | helmet; sleeve | 1020x1083 | svg | en:File:Las_Vegas_Raiders_logo.svg | Fair use (non-free) | #0C0C0C #FCFCFC #CCCCCC |
| `LV_word.png` | Raiders | RAIDERS wordmark | chest above number | 1024x191 | thumb.php | commons:File:Las_Vegas_Raiders_wordmark.svg | Public domain [trademarked] | #0C0C0C |
| `LAC.png` | Chargers | primary logo | helmet (bolt); sleeve | 1013x448 | svg | commons:File:Los_Angeles_Chargers_logo.svg | Public domain [trademarked] | #FCCC0C #0C84CC #FCFCFC |
| `LAC_classic.png` | Chargers | 1960 Los Angeles Chargers shield | throwback | 704x1008 | thumb.php | en:File:Los_Angeles_Charges_classic_mark.svg | Fair use (non-free) | #0C84CC #FCFCFC #FCCC0C |
| `LAC_word.png` | Chargers | LOS ANGELES / CHARGERS wordmark | chest above number | 1014x261 | thumb.php | commons:File:Los_Angeles_Chargers_wordmark.svg | Public domain [trademarked] | #0C0C3C |
| `LAC_word_city.png` | Chargers | city line of the LAC wordmark | chest above number | 813x47 | thumb.php | commons:File:Los_Angeles_Chargers_wordmark.svg | Public domain [trademarked] | #0C0C3C |
| `LAC_word_name.png` | Chargers | name line of the LAC wordmark | chest above number | 1014x195 | thumb.php | commons:File:Los_Angeles_Chargers_wordmark.svg | Public domain [trademarked] | #0C0C3C |
| `DAL.png` | Cowboys | primary logo | helmet; sleeve; pants | 1018x968 | svg | commons:File:Dallas_Cowboys.svg | Public domain [trademarked] | #0C243C #FCFCFC |
| `DAL_word.png` | Cowboys | COWBOYS wordmark | chest/sleeve (rare) | 1024x174 | thumb.php | commons:File:Cowboys_wordmark.svg | Public domain [trademarked] | #0C243C |
| `NYG.png` | Giants | primary logo | helmet; chest (ny); sleeve | 1014x787 | svg | commons:File:New_York_Giants_logo.svg | Public domain [trademarked] | #0C246C #B4243C |
| `NYG_white.png` | Giants | primary logo, white fill (blue fill of NYG.png recoloured white, red outline kept) | blue helmet decal | 1014x787 | svg | commons:File:New_York_Giants_logo.svg | Public domain [trademarked] | #FFFFFF #B4243C |
| `NYG_word.png` | Giants | GIANTS wordmark | chest above number (Giants wear it on the chest of alternates) | 1024x395 | thumb.php | commons:File:New_York_Giants_wordmark.svg | Public domain [trademarked] | #0C246C |
| `PHI.png` | Eagles | primary logo | helmet; sleeve | 1016x700 | svg | en:File:Philadelphia_Eagles_logo.svg | Fair use (non-free) | #FCFCFC #0C0C0C #9CB4B4 |
| `PHI_tb.png` | Eagles | Kelly-green throwback eagle | throwback sleeve | 147x164 | recut from full-size uniform sheet | commons:File:Philadelphia_Eagles_Uniforms_(2026).png | CC BY 4.0 (uniform sheet); mark itself trademarked | #FCFCFC #0C0C0C |
| `PHI_word.png` | Eagles | EAGLES wordmark (2022-present) | chest above number | 1016x165 | thumb.php | commons:File:Philadelphia_Eagles_wordmark_(2022%E2%80%93present).svg | Public domain [trademarked] | #0C5454 |
| `PHI_word_wing.png` | Eagles | winged EAGLES wordmark | chest | 1010x333 | thumb.php | commons:File:Philadelphia_Eagles_wordmark.svg | Public domain [trademarked] | #FCFCFC #0C0C0C |
| `WAS.png` | Commanders | primary logo | helmet (W); sleeve | 1024x559 | svg | commons:File:Washington_Commanders_logo.svg | Public domain [trademarked] | #540C0C #FCB40C |
| `WAS_word.png` | Commanders | WASHINGTON / COMMANDERS wordmark | chest above number | 1015x319 | thumb.php | commons:File:Washington_Commanders_wordmark.svg | Public domain [trademarked] | #540C0C |
| `WAS_word_city.png` | Commanders | city line of the WAS wordmark | chest above number | 819x49 | thumb.php | commons:File:Washington_Commanders_wordmark.svg | Public domain [trademarked] | #540C0C |
| `WAS_word_name.png` | Commanders | name line of the WAS wordmark | chest above number | 1015x152 | thumb.php | commons:File:Washington_Commanders_wordmark.svg | Public domain [trademarked] | #540C0C |
| `CHI.png` | Bears | primary logo | helmet (C); sleeve | 1023x681 | svg | commons:File:Chicago_Bears_logo.svg | Public domain [trademarked] | #CC3C0C #FCFCFC #0C0C24 |
| `CHI_bear.png` | Bears | Bear head | sleeve / alternate | 1024x1014 | thumb.php | en:File:Chicago_Bears_logo_primary.svg | Fair use (non-free) | #0C0C24 #E43C0C #FCFCFC |
| `CHI_word.png` | Bears | BEARS wordmark | chest above number | 1015x145 | thumb.php | commons:File:Chicago_Bears_wordmark.svg | Public domain [trademarked] | #E43C0C |
| `DET.png` | Lions | primary logo | helmet; sleeve | 1009x768 | svg | en:File:Detroit_Lions_logo.svg | Fair use (non-free) | #0C6CB4 #FCFCFC #B4B4B4 |
| `DET_word.png` | Lions | LIONS wordmark | chest above number | 1014x268 | thumb.php | commons:File:Detroit_Lions_wordmark.svg | Public domain [trademarked] | #0C6CB4 |
| `GB.png` | Packers | primary logo | helmet (G); sleeve | 1013x666 | svg | commons:File:Green_Bay_Packers_logo.svg | Public domain [trademarked] | #FCFCFC #243C3C |
| `GB_word.png` | Packers | PACKERS wordmark | chest above number | 1014x299 | thumb.php | commons:File:Green_Bay_Packers_wordmark.svg | Public domain [trademarked] | #243C3C |
| `MIN.png` | Vikings | primary logo | helmet (Viking head, horn variant on helmet); sleeve | 1008x1242 | svg | en:File:Minnesota_Vikings_logo.svg | Fair use (non-free) | #FCFCFC #FCCC24 #0C0C0C #542484 |
| `MIN_word.png` | Vikings | VIKINGS wordmark | chest above number | 1023x331 | thumb.php | commons:File:Minnesota_Vikings_wordmark.svg | Public domain [trademarked] | #542484 #84546C #E4B43C #B48454 |
| `MIN_word_1982.png` | Vikings | VIKINGS wordmark (1982-2003) | throwback | 1014x200 | thumb.php | commons:File:Minnesota_Vikings_wordmark_(1982_-_2003).svg | Public domain [trademarked] | #3C0C6C |
| `ATL.png` | Falcons | primary logo | helmet; sleeve | 1016x964 | svg | en:File:Atlanta_Falcons_logo.svg | Fair use (non-free) | #0C0C0C #FCFCFC #9CB4B4 |
| `ATL_tb.png` | Falcons | 1966 black falcon (throwback) | throwback helmet / sleeve | 147x192 | recut from full-size uniform sheet | commons:File:Atlanta_Falcons_Uniforms_2026.png | CC BY-SA 4.0 (uniform sheet); mark itself trademarked | #242424 #FCFCFC |
| `ATL_word.png` | Falcons | ATLANTA / FALCONS wordmark | chest above number (2026 redesign) | 1003x211 | thumb.php | commons:File:Atlanta_Falcons_wordmark.svg | Public domain [trademarked] | #0C0C0C #B4243C |
| `ATL_word_city.png` | Falcons | city line of the ATL wordmark | chest above number (2026 redesign) | 556x57 | thumb.php | commons:File:Atlanta_Falcons_wordmark.svg | Public domain [trademarked] | #B4243C |
| `ATL_word_name.png` | Falcons | name line of the ATL wordmark | chest above number (2026 redesign) | 1003x111 | thumb.php | commons:File:Atlanta_Falcons_wordmark.svg | Public domain [trademarked] | #0C0C0C |
| `CAR.png` | Panthers | primary logo | helmet; sleeve | 1024x557 | svg | en:File:Carolina_Panthers_logo.svg | Fair use (non-free) | #0C0C0C #0C84CC |
| `CAR_word.png` | Panthers | CAROLINA / PANTHERS wordmark | chest above number | 1024x395 | thumb.php | commons:File:Carolina_Panthers_wordmark.svg | Public domain [trademarked] | #0C84CC |
| `CAR_word_city.png` | Panthers | city line of the CAR wordmark | chest above number | 871x185 | thumb.php | commons:File:Carolina_Panthers_wordmark.svg | Public domain [trademarked] | #0C84CC |
| `CAR_word_name.png` | Panthers | name line of the CAR wordmark | chest above number | 926x191 | thumb.php | commons:File:Carolina_Panthers_wordmark.svg | Public domain [trademarked] | #0C84CC |
| `NO.png` | Saints | primary logo | helmet (fleur-de-lis); sleeve; pants hip | 1017x1240 | svg | commons:File:New_Orleans_Saints_logo.svg | Public domain [trademarked] | #0C0C0C #CCB484 #FCFCFC |
| `NO_word.png` | Saints | SAINTS wordmark | chest above number | 1014x236 | thumb.php | commons:File:New_Orleans_Saints_wordmark.svg | Public domain [trademarked] | #0C0C0C |
| `TB.png` | Buccaneers | primary logo | helmet (flag); sleeve | 1017x905 | svg | en:File:Tampa_Bay_Buccaneers_logo.svg | Fair use (non-free) | #9C243C #0C0C0C #B4CCCC #FCFCFC |
| `TB_tb.png` | Buccaneers | Bucco Bruce (1976-96) | throwback helmet | 285x303 | recut from full-size uniform sheet | commons:File:Tampa_Bay_Buccaneers_Uniforms_(2026).png | CC BY 4.0 (uniform sheet); mark itself trademarked | #CC0C24 #FC840C #FCFCFC |
| `TB_word.png` | Buccaneers | TAMPA BAY / BUCCANEERS wordmark | chest above number | 1024x283 | thumb.php | commons:File:Tampa_Bay_Buccaneers_wordmark.svg | Public domain [trademarked] | #B4243C #B4B4CC |
| `TB_word_name.png` | Buccaneers | (existing file, source not re-verified) |  | 1005x210 |  |  |  |  |
| `ARI.png` | Cardinals | primary logo | helmet; sleeve | 1015x913 | svg | en:File:Arizona_Cardinals_logo.svg | Fair use (non-free) | #9C243C #0C0C0C #FCB40C |
| `ARI_word.png` | Cardinals | ARIZONA / CARDINALS wordmark | chest above number | 1015x196 | thumb.php | commons:File:Arizona_Cardinals_wordmark.svg | Public domain [trademarked] | #9C243C |
| `ARI_word_city.png` | Cardinals | city line of the ARI wordmark | chest above number | 612x72 | thumb.php | commons:File:Arizona_Cardinals_wordmark.svg | Public domain [trademarked] | #9C243C |
| `ARI_word_name.png` | Cardinals | name line of the ARI wordmark | chest above number | 1015x96 | thumb.php | commons:File:Arizona_Cardinals_wordmark.svg | Public domain [trademarked] | #9C243C |
| `LAR.png` | Rams | primary logo | primary logo (LA monogram); sleeve / pants | 1024x735 | svg | en:File:LA_Rams_logo.svg | Fair use (non-free) | #FCCC0C #0C3C9C |
| `LAR_ram.png` | Rams | ram head (2000-16) | throwback | 1024x730 | thumb.php | en:File:NFL_Rams_logo.svg | Fair use (non-free) | #0C243C #B49C54 #FCFCFC |
| `LAR_word.png` | Rams | LOS ANGELES / Rams script wordmark | chest above number | 1014x416 | thumb.php | commons:File:Los_Angeles_Rams_wordmark.svg | Public domain [trademarked] | #0C243C #FCFCFC #3C546C |
| `LAR_word_alt.png` | Rams | LOS ANGELES / RAMS block wordmark | chest / sleeve | 1010x360 | thumb.php | commons:File:LA_Rams_wordmark.svg | Public domain [trademarked] | #0C3C9C |
| `SF.png` | 49ers | primary logo | helmet (SF oval); sleeve | 1024x605 | svg | commons:File:San_Francisco_49ers_logo.svg | Public domain [trademarked] | #B40C0C #0C0C0C #FCFCFC #B49C54 |
| `SF_word.png` | 49ers | 49ERS wordmark | chest above number | 1015x194 | thumb.php | commons:File:San_Francisco_49ers_wordmark.svg | Public domain [trademarked] | #B40C0C #0C0C0C #84543C |
| `SEA.png` | Seahawks | primary logo | helmet; sleeve | 1024x453 | svg | en:File:Seattle_Seahawks_logo.svg | Fair use (non-free) | #0C243C #FCFCFC #9CB4B4 |
| `SEA_word.png` | Seahawks | SEATTLE / SEAHAWKS wordmark | chest above number | 1015x156 | thumb.php | commons:File:Seattle_Seahawks_wordmark.svg | Public domain [trademarked] | #0C243C #9CB4B4 |
| `SEA_word_city.png` | Seahawks | city line of the SEA wordmark | chest above number | 638x43 | thumb.php | commons:File:Seattle_Seahawks_wordmark.svg | Public domain [trademarked] | #B4B4B4 |
| `SEA_word_name.png` | Seahawks | name line of the SEA wordmark | chest above number | 1015x108 | thumb.php | commons:File:Seattle_Seahawks_wordmark.svg | Public domain [trademarked] | #0C243C |
| `NFL_shield.png` | NFL / Nike | NFL shield (2008-present) | jersey V-neck collar, pants/sleeve | 1019x1405 | svg | en:File:National_Football_League_logo.svg | CC-BY-4.0 [design|trademarked] | #FCFCFC #0C3C6C #CC0C0C |
| `nike_swoosh.png` | NFL / Nike | Nike swoosh | jersey/pants (apparel mark) | 1024x365 | svg | commons:File:Logo_NIKE.svg | Public domain [trademarked] | #0C0C0C |

## Notes on specific files

- `<TEAM>_word` is the club's official wordmark (Wikimedia `<Team> wordmark.svg`, PD-textlogo). For stacked wordmarks `<TEAM>_word_city` / `_word_name` are the two lines cropped from the same artwork (e.g. `CIN_word_name` = BENGALS, `ARI_word_city` = ARIZONA). `TEN_word` and `TB_word` could not be split: the small top line touches the tall letters of the second line.
- Wordmarks are drawn in the club colours (some two-tone: Ravens black + gold outline, Dolphins aqua + orange, Chargers navy + gold underline). For one-colour use the runtime tint `KEY@#hex`.
- `LAR` is the current Rams primary (LA monogram); `LAR_ram` is the 2000-2016 ram head; the 2026 horn mark has no clean Wikimedia source (see below).
- `NE_pat` replaces the old sheet crop with the SVG of the same Pat Patriot mark; `NYJ_word` replaces the old file with the SVG render of the same wordmark (`NYJ_word_plain` is the plainer JETS lettering, `NYJ_1978` the 1978-97 JETS mark).
- `NE_ne` and `CLE_elf` are raster-only sources (496x362 and 147x168 px, never upscaled): the elf is soft when drawn large.
- Low-res legacy crops (`*_tb`, `BAL_dark`, `NYJ_classic`, `NYJ_plane`, `PIT_crest`) come from the Commons uniform sheets (100-300 px); they were cleaned (stray fragments of neighbouring marks removed, edge colours bled from solid pixels) but cannot be sharper than the sheet.
- `PHI_tb`, `DEN_tb`, `ATL_tb` and `TB_tb` were re-cut from the full-size sheets with `research/recut_marks.py` (Oct 2026): `TB_tb` had been cut from a downscaled copy (now 285x303, was 176x186); `PHI_tb` had lost its black outlines and the football to the background removal (the sleeve edge clips the eagle on the sheet itself); `DEN_tb` and `ATL_tb` lose the blue/red helmet-colour fringe. `JAX_tb`, `MIA_tb`, `NYJ_classic` and `PIT_crest` are already at the sheet's native resolution and a re-cut was no better. Searched again: Commons/en.wikipedia have no standalone file of any of these marks (only the Pittsburgh city arms, a different drawing from the Steelers crest, and unrelated JETS wordmarks).

## Not found (no clean Wikimedia source)

- **Rams 2026 ram-horn helmet/sleeve mark**: Wikimedia only has the LA monogram, the 2000-16 ram head and the horn-helmet drawing. `ramhorn()` in teams.js stays as the fallback.
- **Steelers steelmark alone** (three hypocycloids, no ring/text) for the helmet: only the ringed "Steelers" logo (`PIT`) and the older "Steel" ring are on Wikimedia; the ring cannot be removed without redrawing.
- **Ravens** shield patch and the 2026 redesign secondary marks (`BAL_dark` is the only extra, from the sheet); **Bears** "GSH" sleeve patch; **Titans** 2026 secondary (flaming T / sleeve marks); **Falcons** 2026 redesign secondary marks; **Commanders** alt marks; **Giants** capital "NY"; **Dolphins** alternate dolphin; **Saints** alt; **Vikings** horn; **Seahawks** alternates; **Eagles** Kelly-green throwback eagle, **Broncos** 1968 "D", **Bucs** Bucco Bruce, **Jaguars** 1995 mark, **Dolphins** 1966 throwback dolphin, **Steelers** 1933 crest, **Jets** classic oval and Gotham plate, **Falcons** 1966: no standalone file, only crops of the uniform sheets (130-300 px, see the notes above).
- **Typeset text that is not a mark** (needs no image): "BILLS MAFIA", "GO BILLS", "H-TOWN", "WE ARE ALL PATRIOTS", "DIRTY BIRDS", "GO FINS!" etc.
- Colts jerseys, Raiders, Cowboys etc. have no extra secondary marks on Wikimedia beyond those listed.

