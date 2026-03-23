-- Nova Migração Baseada em ID (cod_colab)
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'FR7616598000013191717000163', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0530' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7616598000013191717000163');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1601822247070201677660', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1855' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1601822247070201677660');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE13905014844239', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0663' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE13905014844239');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6801820702370201650072', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0513' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6801820702370201650072');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE53905011702853', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0432' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE53905011702853');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7168930001710000304078', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0687' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7168930001710000304078');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801824590120201618527', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0570' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801824590120201618527');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE31905198476555', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0452' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE31905198476555');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES1100493121922014308753', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0516' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1100493121922014308753');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004563932644105', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0814' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004563932644105');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4301820706190201644996', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0194' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301820706190201644996');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES2115761212191010412202', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0406' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2115761212191010412202');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4601828151890201938271', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1402' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4601828151890201938271');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'REVOLUT', 'LT853250012616725392', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0347' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LT853250012616725392');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6401821216250201598939', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0272' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6401821216250201598939');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9201820635510201631740', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0189' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201820635510201631740');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE86905298453950', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0208' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE86905298453950');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2501829725810200292530', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0134' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501829725810200292530');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE93905290491967', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0449' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE93905290491967');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7701820362250201593681', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1448' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7701820362250201593681');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PT50001800035744329302015', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2142' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001800035744329302015');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5501821214330201624902', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2114' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5501821214330201624902');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4668930001740000283429', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0460' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4668930001740000283429');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601821250440201578825', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1382' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601821250440201578825');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE72905409370016', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0648' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE72905409370016');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4068930001750000234018', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0243' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4068930001750000234018');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES5800495413542216093588', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1770' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5800495413542216093588');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50000700000078411618523', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0662' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000078411618523');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE13905367342239', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0009' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE13905367342239');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6901820043170201680589', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0128' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6901820043170201680589');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004558399366405', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1253' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004558399366405');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501828181150202341275', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1380' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501828181150202341275');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101821270960201668003', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0388' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101821270960201668003');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401822082150201689129', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1921' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401822082150201689129');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000079035241223', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1319' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000079035241223');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8601828181160202346058', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0593' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8601828181160202346058');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3501825430470201692651', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0302' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3501825430470201692651');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4501825400270202218266', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1400' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4501825400270202218266');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5868930001770000275112', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0362' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5868930001770000275112');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4901828181130202328441', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0456' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901828181130202328441');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2968930001740000367834', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2098' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2968930001740000367834');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE28905021457720', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0386' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE28905021457720');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE56905565139888', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1684' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE56905565139888');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6001829050120201703133', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1451' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001829050120201703133');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BPI', 'PT50001000006025485000120', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1313' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000006025485000120');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8968930001780000347643', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2074' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8968930001780000347643');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6001820956510201788150', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1355' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001820956510201788150');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6068930001740000337594', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1973' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6068930001740000337594');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4268930001790000264147', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1128' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4268930001790000264147');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE67967413038187', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0254' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE67967413038187');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50000700000078646775623', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0934' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000078646775623');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8001822620950201648696', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1244' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8001822620950201648696');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'N26', 'ES3115632626303260992916', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1232' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3115632626303260992916');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE21905055900703', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0888' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE21905055900703');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE48967986321527', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0769' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE48967986321527');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4368930001740000308121', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1707' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4368930001740000308121');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4801826398210201694761', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0677' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4801826398210201694761');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'NL02BUNQ2185043757', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0166' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL02BUNQ2185043757');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3801823921650201615554', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0651' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3801823921650201615554');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0901820702370201648709', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0565' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0901820702370201648709');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6601825430480201691559', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2079' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601825430480201691559');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9701820648680201557514', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0247' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9701820648680201557514');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7001824003190201671817', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0442' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7001824003190201671817');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6701825011170202240429', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1404' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6701825011170202240429');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3301822229540201618236', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1882' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3301822229540201618236');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4601827541380201606259', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1192' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4601827541380201606259');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004565878163405', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1330' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004565878163405');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5601820600080201749832', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1878' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5601820600080201749832');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE72905583388016', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1703' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE72905583388016');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE23905188906291', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0175' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE23905188906291');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5101821245140201662379', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0536' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5101821245140201662379');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'ACTIVOBANK', 'PT50002300004556293525594', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1331' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50002300004556293525594');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4401825011110202242883', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2067' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4401825011110202242883');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5201821306980201688854', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1891' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5201821306980201688854');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE86905222473850', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0500' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE86905222473850');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7601825005010201594458', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0795' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7601825005010201594458');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0401828181150202337883', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0285' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401828181150202337883');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3068930001790000275712', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0359' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3068930001790000275712');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201826337440201581251', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1406' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201826337440201581251');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE27905183482173', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0617' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE27905183482173');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6401823961540201766982', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1888' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6401823961540201766982');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE79967804883633', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0778' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE79967804883633');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3601820702310201650263', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0085' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3601820702310201650263');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0801823921600201612265', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0581' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0801823921600201612265');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE77967935592042', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0529' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE77967935592042');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3301829050110201702116', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1452' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3301829050110201702116');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES2721001553690200374216', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0487' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2721001553690200374216');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE63905368842608', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1453' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE63905368842608');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9001820581120201601758', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2153' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9001820581120201601758');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7601822125320201601042', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1454' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7601822125320201601042');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401823660130201646314', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0038' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401823660130201646314');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5600492661422514474511', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1455' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5600492661422514474511');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004566827376305', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1332' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004566827376305');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101829502210201762468', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0621' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101829502210201762468');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5921000639010201049195', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0625' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5921000639010201049195');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7168930001740000273085', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0213' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7168930001740000273085');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2501820720960201636676', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0712' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501820720960201636676');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE82967895582168', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2126' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE82967895582168');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1201825141510201586263', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1201' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1201825141510201586263');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101825322210002961488', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2137' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101825322210002961488');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2201820394300201766941', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1801' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2201820394300201766941');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0868930001760000346871', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2073' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0868930001760000346871');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1201828674410201650081', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0545' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1201828674410201650081');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4868930001700000309973', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1736' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4868930001700000309973');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3768930001700000217924', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0383' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3768930001700000217924');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9168930001760000260211', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0177' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9168930001760000260211');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1668930001760000311031', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1723' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1668930001760000311031');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE74905576441907', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1749' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE74905576441907');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'FR7616598000014000101905939', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0401' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7616598000014000101905939');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1801820345130201859245', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1790' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1801820345130201859245');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES0721002343330700505021', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1457' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0721002343330700505021');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES0600493063352314146677', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1694' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0600493063352314146677');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7001828191710202049338', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0062' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7001828191710202049338');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401822270010202481802', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1590' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401822270010202481802');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4300491330562010278931', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0209' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4300491330562010278931');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3268930001710000155691', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0020' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3268930001710000155691');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7168930001710000263726', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0201' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7168930001710000263726');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5901822620910201646263', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0548' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5901822620910201646263');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1301827029780201591693', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1458' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1301827029780201591693');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9201820706150201644989', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0195' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201820706150201644989');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4101820702340201653712', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1842' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4101820702340201653712');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE29967554229064', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2103' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE29967554229064');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE92905300798623', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0250' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE92905300798623');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'ING BANK', 'PL82105017931000009764816352', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1249' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL82105017931000009764816352');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6301828674470201650906', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1979' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6301828674470201650906');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE70905048802525', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0756' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE70905048802525');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1701820956500201791495', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1762' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701820956500201791495');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES8721000309840200627243', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0292' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8721000309840200627243');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8601820382710201672230', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0052' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8601820382710201672230');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7601820710110201567867', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1682' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7601820710110201567867');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE80905685709777', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1897' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE80905685709777');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6801826106040201617587', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1668' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6801826106040201617587');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6701823191860201750801', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1821' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6701823191860201750801');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2401828680370200398752', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0558' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2401828680370200398752');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601821649210201671636', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0622' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601821649210201671636');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4301823350110201602525', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0752' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301823350110201602525');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CA CREDITO AGRICOLA', 'PT50004531614039663185880', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1333' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50004531614039663185880');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401822620980201647853', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0360' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401822620980201647853');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE92905390290823', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0153' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE92905390290823');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7401829035110201734235', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2094' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7401829035110201734235');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7801824951140201785150', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1459' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801824951140201785150');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0568930001790000335429', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1995' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0568930001790000335429');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4401824388190201865368', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0277' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4401824388190201865368');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2801820917010201755296', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2048' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2801820917010201755296');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6201821965170201698881', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0152' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6201821965170201698881');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4901821268890201598129', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0060' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901821268890201598129');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801825900090201571022', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2012' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801825900090201571022');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3200496156952810013154', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0451' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3200496156952810013154');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1201829035120201720461', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1943' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1201829035120201720461');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'FR7616598000014000104278559', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0271' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7616598000014000104278559');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3568930001710000282901', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1599' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3568930001710000282901');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201820674110201632636', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1695' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201820674110201632636');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE32905040429102', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0041' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE32905040429102');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE30967357042111', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0933' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE30967357042111');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1201821433000201886585', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0252' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1201821433000201886585');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE96905420553005', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0155' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE96905420553005');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2968930001750000286111', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1460' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2968930001750000286111');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3401824143270201937934', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0176' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3401824143270201937934');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE56905773524988', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2020' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE56905773524988');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101820660440201672824', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1461' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101820660440201672824');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4201820152880201763908', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0133' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4201820152880201763908');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4501820606800201781704', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0396' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4501820606800201781704');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3501828151880201937742', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1407' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3501828151880201937742');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE44905532126445', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1679' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE44905532126445');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801822125390201601356', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1731' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801822125390201601356');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6768930001750000335479', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1989' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6768930001750000335479');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'NL79BUNQ2117972691', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0231' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL79BUNQ2117972691');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101826855860201804597', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0016' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101826855860201804597');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE20967993124156', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0313' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE20967993124156');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES1700495774492916212724', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2026' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1700495774492916212724');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9001820660410201672435', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0100' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9001820660410201672435');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1701824027280201882590', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1860' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701824027280201882590');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE62905304284761', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0402' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE62905304284761');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE10905069257704', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0012' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE10905069257704');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE68905722516934', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1976' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE68905722516934');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2901820573150201733186', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0481' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2901820573150201733186');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE41967957850310', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0144' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE41967957850310');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE19967770223412', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0736' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE19967770223412');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9868930001750000301747', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0745' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9868930001750000301747');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE88905120467741', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0782' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE88905120467741');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8268930001760000293256', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1464' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8268930001760000293256');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES4221001162410200545121', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1303' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4221001162410200545121');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES2700492439132715434791', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1465' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2700492439132715434791');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES5915761212101010408758', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0926' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5915761212101010408758');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9768930001770000272470', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0553' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9768930001770000272470');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES7121000868590201072129', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2095' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7121000868590201072129');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101821140370201702808', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1815' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101821140370201702808');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3101822247010201677684', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1854' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3101822247010201677684');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6801826855840201797086', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0013' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6801826855840201797086');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2501820838650201575647', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0491' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501820838650201575647');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3068930001710000252727', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0325' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3068930001710000252727');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2401824003170201677884', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2054' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2401824003170201677884');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1601828674420201649087', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0801' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1601828674420201649087');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2701826560150201598578', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1874' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2701826560150201598578');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0501821418950201611982', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0797' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0501821418950201611982');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE27905693905873', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1982' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE27905693905873');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8601828181130202343295', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1466' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8601828181130202343295');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4101827312980201652010', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1759' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4101827312980201652010');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5301823507460202312326', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0331' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5301823507460202312326');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES9721004247142200317610', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1923' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9721004247142200317610');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8301820382780201675239', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1467' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8301820382780201675239');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101828191750202049345', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0063' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101828191750202049345');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE28905743952520', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2050' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE28905743952520');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE84905102767059', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0454' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE84905102767059');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6701826790020201766057', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1468' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6701826790020201766057');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8568930001730000341558', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2120' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8568930001730000341558');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1601822620900201648832', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0459' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1601822620900201648832');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'RIB', 'FR7630003027530005026110266', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0295' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7630003027530005026110266');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4001821428600201570857', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0420' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4001821428600201570857');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7301824532550201769164', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0861' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7301824532550201769164');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE02967008136040', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0546' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE02967008136040');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES8221000137310700007237', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0629' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8221000137310700007237');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES5000495082712316182021', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1129' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5000495082712316182021');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0901820382760201676669', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1835' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0901820382760201676669');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE67967609472887', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2131' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE67967609472887');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004556298142705', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1254' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004556298142705');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6601822952050201639377', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1469' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601822952050201639377');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES6421000003110700003310', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1083' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6421000003110700003310');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8901820869210201876577', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0499' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901820869210201876577');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1968930001750000319465', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1776' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1968930001750000319465');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601829050190201699522', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1909' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601829050190201699522');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES9621004247102200317145', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1918' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9621004247102200317145');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE64905575874152', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1673' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE64905575874152');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1001820652630201527600', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0330' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1001820652630201527600');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE27967393054773', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1220' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE27967393054773');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501827029760201591853', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1470' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501827029760201591853');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9601821428600201570819', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0415' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9601821428600201570819');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES4300490154962710055068', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0145' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4300490154962710055068');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE23905667552791', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1898' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE23905667552791');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201825319770000834229', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2151' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201825319770000834229');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601828674430201648442', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0599' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601828674430201648442');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7401822620900201647594', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1367' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7401822620900201647594');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9768930001740000262529', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0073' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9768930001740000262529');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7301822620990201646201', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1373' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7301822620990201646201');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3101820361840201606315', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1895' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3101820361840201606315');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE42967427837054', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1219' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE42967427837054');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4501825011100202230886', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0096' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4501825011100202230886');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PL18102039580000990203353992', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0506' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL18102039580000990203353992');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2801824641170201639510', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0256' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2801824641170201639510');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'REVOLUT', 'LT973250098046320057', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1312' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LT973250098046320057');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES9121003726992200324762', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0303' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9121003726992200324762');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES7215761212131010487335', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1408' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7215761212131010487335');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2268930001780000337597', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1998' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2268930001780000337597');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE34905650868690', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1824' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE34905650868690');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2268930001700000325573', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1853' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2268930001700000325573');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2001822125320201601080', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1471' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2001822125320201601080');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0301828674450201644518', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0534' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0301828674450201644518');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0501826786010201555380', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0361' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0501826786010201555380');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE36905373651481', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1602' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE36905373651481');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BANCO MONTEPIO', 'PT50003601359910004781462', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1663' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003601359910004781462');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8468930001730000295016', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1472' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8468930001730000295016');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6301820956570201791488', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1764' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6301820956570201791488');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0968930001740000277208', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0592' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0968930001740000277208');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4901827029720201592115', 'ATIVO', 'Importado via Planilha de Controle ID - Observações RH: DATOS DE STOCCO'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1473' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901827029720201592115');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE86967587304650', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1054' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE86967587304650');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE74905481498307', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1474' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE74905481498307');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXA GERAL', 'PT50003501590009099363071', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1659' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003501590009099363071');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2201820606840201783571', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0403' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2201820606840201783571');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501825141560201586256', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1386' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501825141560201586256');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3601824609910205764108', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0083' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3601824609910205764108');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9268930001700000273097', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0214' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9268930001700000273097');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE29905665697364', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1859' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE29905665697364');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3001820704270201565204', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1730' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3001820704270201565204');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE47905622737680', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1760' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE47905622737680');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7368930001760000300984', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0884' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7368930001760000300984');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3600495475802116100749', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1105' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3600495475802116100749');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7868930001700000242600', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0297' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7868930001700000242600');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9401820573160201733131', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0482' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9401820573160201733131');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004566436194705', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1255' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004566436194705');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7601826786020201557836', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2021' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7601826786020201557836');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3801828181150202338435', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0283' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3801828181150202338435');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6801820496640201794655', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0477' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6801820496640201794655');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7968930001780000191459', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1368' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7968930001780000191459');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2901822939880200175321', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0613' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2901822939880200175321');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101825430410201692200', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0473' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101825430410201692200');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE46967838639936', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0823' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE46967838639936');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2001828181110202338664', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0284' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2001828181110202338664');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1401820927870201639090', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1193' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1401820927870201639090');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2301828181120202338367', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0278' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2301828181120202338367');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3468930001710000204252', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0170' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3468930001710000204252');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7201823275580201652629', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1476' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7201823275580201652629');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101827312960201646912', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0049' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101827312960201646912');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE90905028986132', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1095' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE90905028986132');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE39905533103519', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1477' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE39905533103519');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE43967858860901', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0544' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE43967858860901');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL16109011020000000162520599', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1397' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL16109011020000000162520599');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4568930001760000280633', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0219' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4568930001760000280633');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3800490199032811368533', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0578' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3800490199032811368533');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3701820702310201648693', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1478' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3701820702310201648693');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101820578440204473822', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0550' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101820578440204473822');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE24905690177538', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1826' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE24905690177538');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004564644711405', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1245' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004564644711405');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE98905290513993', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0356' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE98905290513993');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'DolarApp', 'LU764080000044756306', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2075' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LU764080000044756306');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5601826800920201790542', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1148' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5601826800920201790542');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7701826556140201675430', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2134' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7701826556140201675430');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5068930001780000320021', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1742' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5068930001780000320021');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE15905240009430', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0973' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE15905240009430');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE75905728823651', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1970' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE75905728823651');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES7015761212111010413846', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0279' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7015761212111010413846');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8701821077370201624772', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2090' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701821077370201624772');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE06905582845422', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1697' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE06905582845422');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES8900490627972610855510', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1868' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8900490627972610855510');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE53905059979753', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0974' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE53905059979753');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES106893000171000017 1510', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0543' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES106893000171000017 1510');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'NL48BUNQ2166150918', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0600' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL48BUNQ2166150918');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5501824960210201664297', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1774' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5501824960210201664297');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5701823275520201652902', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0572' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5701823275520201652902');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7668930001790000285845', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0115' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7668930001790000285845');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5101826786070201555519', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1119' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5101826786070201555519');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'NL52BUNQ2185106392', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0161' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL52BUNQ2185106392');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601825322210206807313', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0615' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601825322210206807313');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2401824003120201671824', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1206' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2401824003120201671824');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8901827345480201713250', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1806' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901827345480201713250');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE54905206667597', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0225' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE54905206667597');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0701824388130201866231', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0984' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0701824388130201866231');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601822125390201601073', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1481' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601822125390201601073');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'DolarApp', 'LU834080000043299628', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2015' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LU834080000043299628');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4701821710390201669113', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1482' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4701821710390201669113');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE90905350938832', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0106' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE90905350938832');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4301821248380201549938', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1740' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301821248380201549938');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE76905446655095', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0637' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE76905446655095');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'NL18BUNQ2155083661', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1411' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL18BUNQ2155083661');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE31905298793955', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0363' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE31905298793955');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0701826755440201574187', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0661' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0701826755440201574187');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0901822626600201694554', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0692' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0901822626600201694554');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7168930001730000335020', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1937' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7168930001730000335020');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES2021004247162200320062', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1915' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2021004247162200320062');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE28905239339120', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0107' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE28905239339120');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE18905477478665', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0494' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE18905477478665');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE81967815271424', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0427' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE81967815271424');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE61905166714917', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1334' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE61905166714917');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0701829055430201662936', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0257' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0701829055430201662936');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE58905516318879', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1412' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE58905516318879');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4301820615000201620601', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1677' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301820615000201620601');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE97905449715649', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0497' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE97905449715649');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE50905059966518', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0030' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE50905059966518');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE21905348646703', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1130' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE21905348646703');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6001820701970201608623', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0507' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001820701970201608623');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE49905461028071', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0631' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE49905461028071');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6468930001720000293097', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1484' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6468930001720000293097');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4501822455600201653568', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1413' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4501822455600201653568');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3301820702390201650119', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0559' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3301820702390201650119');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2001820606870201783557', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0232' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2001820606870201783557');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6801829730260200359385', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1907' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6801829730260200359385');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201826936180201599523', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1485' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201826936180201599523');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0701821215880201553957', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1787' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0701821215880201553957');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXADIRECTA', 'PT50003503790000708013058', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0057' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003503790000708013058');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9468930001780000292166', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0364' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9468930001780000292166');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE08905180100513', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0180' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE08905180100513');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8701824960210201664303', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1773' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701824960210201664303');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE49905746634871', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2046' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE49905746634871');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES0821005002490200136934', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0332' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0821005002490200136934');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9101826398220201693065', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0294' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9101826398220201693065');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5601827421520202702061', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1190' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5601827421520202702061');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4601820917030201747017', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1486' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4601820917030201747017');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3568930001740000316219', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1712' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3568930001740000316219');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1301822082160201689112', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1922' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1301822082160201689112');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1701825764550201664146', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0357' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701825764550201664146');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES2600491330522410278915', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0210' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2600491330522410278915');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101824036530201672085', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2045' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101824036530201672085');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE40905305963063', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0233' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE40905305963063');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7701820496680201794297', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0784' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7701820496680201794297');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6101824291350201595879', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1704' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6101824291350201595879');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3268930001750000242601', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1064' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3268930001750000242601');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8201826800980201797055', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0436' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201826800980201797055');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3301828738710202621047', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0873' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3301828738710202621047');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7001820670170201610227', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1069' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7001820670170201610227');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'N26', 'DE10100110012469 4973 17', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0579' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'DE10100110012469 4973 17');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7801824390280201776818', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1840' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801824390280201776818');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101820424600202543273', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0609' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101820424600202543273');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6001820710160201564806', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0537' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001820710160201564806');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE67905560124887', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1686' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE67905560124887');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES0200491176492910073971', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1488' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0200491176492910073971');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE98967498039893', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1388' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE98967498039893');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7601829725890200294130', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0796' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7601829725890200294130');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50002300004565623053494', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0435' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50002300004565623053494');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5001820699780201642135', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0407' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5001820699780201642135');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5701820845150202202821', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0424' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5701820845150202202821');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8168930001710000335423', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2019' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8168930001710000335423');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5001823212800201577303', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0348' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5001823212800201577303');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0668930001770000337740', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1857' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0668930001770000337740');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6068930001790000178463', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0932' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6068930001790000178463');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000070342731723', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1316' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000070342731723');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000069985102423', 'ATIVO', 'Importado via Planilha de Controle ID - Observações RH: DATOS DE STOCCO'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1317' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000069985102423');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801824018180201694072', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1268' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801824018180201694072');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'REVOLUT', 'LT853250048438121463', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1251' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LT853250048438121463');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES610182818111020234 2582', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1117' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES610182818111020234 2582');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE60905352281270', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1765' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE60905352281270');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5701828181150202338190', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0995' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5701828181150202338190');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'ABANCA', 'ES7420800405443040049938', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1250' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7420800405443040049938');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BANKINTER', 'PT50026903730020941916651', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1713' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50026903730020941916651');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE13905119895239', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0590' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE13905119895239');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'NL53BUNQ2140624599', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0202' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL53BUNQ2140624599');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5001823100870201786163', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0006' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5001823100870201786163');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401823834300201619294', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0179' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401823834300201619294');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50000700000074271396623', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0870' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000074271396623');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8301820057750201616655', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0125' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8301820057750201616655');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE10905226843904', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1131' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE10905226843904');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8101824960240201654661', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0709' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8101824960240201654661');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50000700000038574281123', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1182' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000038574281123');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9168930001700000294358', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1490' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9168930001700000294358');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE06905185193922', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1194' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE06905185193922');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5901826786090201555762', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0389' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5901826786090201555762');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE53905471191853', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0632' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE53905471191853');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7201821150020201593522', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0890' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7201821150020201593522');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES5615761212111010446399', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0235' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5615761212111010446399');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE42905776800154', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2056' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE42905776800154');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2301820529260201678307', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0004' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2301820529260201678307');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000064970697123', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0694' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000064970697123');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7901823212870201575468', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0429' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7901823212870201575468');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BPI', 'PT50001000005989494000131', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1256' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000005989494000131');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0368930001710000340513', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1932' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0368930001710000340513');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE91967980496776', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1257' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE91967980496776');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9401826900240202084331', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1700' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9401826900240202084331');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4801821016520202150813', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0463' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4801821016520202150813');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6501822229500201618632', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2002' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6501822229500201618632');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101822648170201662656', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2052' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101822648170201662656');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES1400491986032810051692', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1086' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1400491986032810051692');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES1100495413522416090490', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0253' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1100495413522416090490');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5468930001790000311849', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1748' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5468930001790000311849');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE35905520834837', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1492' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE35905520834837');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES3321001129770200443416', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0527' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3321001129770200443416');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9001824882260201599907', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1750' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9001824882260201599907');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4901827782410201655700', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0483' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901827782410201655700');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8568930001740000335204', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1933' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8568930001740000335204');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1001824003130201677556', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2033' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1001824003130201677556');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BANCONTACT', 'BE08063654388913', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1181' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE08063654388913');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PL39116022020000000669105520', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1396' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL39116022020000000669105520');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE02967815205140', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0113' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE02967815205140');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401826556120201664399', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2082' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401826556120201664399');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE53905788440053', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2069' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE53905788440053');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE34905066598890', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0753' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE34905066598890');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8668930001710000266269', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0747' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8668930001710000266269');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0268930001710000305029', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1676' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0268930001710000305029');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2301827312920201646905', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0508' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2301827312920201646905');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE45905212574089', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0229' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE45905212574089');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE78905696312786', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1946' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE78905696312786');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'PT50003503610000459193002', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1324' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003503610000459193002');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE33967901409646', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1300' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE33967901409646');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2968930001750000264771', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0966' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2968930001750000264771');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9068930001710000160467', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0608' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9068930001710000160467');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8168930001720000310639', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1832' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8168930001720000310639');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501820496600201797746', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1494' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501820496600201797746');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PL17102041440000640203415973', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0275' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL17102041440000640203415973');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE23967554435491', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2115' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE23967554435491');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE42905483084154', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1948' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE42905483084154');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE30905423677011', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0157' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE30905423677011');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0901820374960201546206', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0169' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0901820374960201546206');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'FR7616598000014000047013251', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0688' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7616598000014000047013251');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5168930001770000340616', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1856' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5168930001770000340616');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE06905688866422', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1911' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE06905688866422');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE39967815193319', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0120' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE39967815193319');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE05905352281775', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0414' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE05905352281775');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8701820117150201701301', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1495' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701820117150201701301');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8901826936130201599615', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1496' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901826936130201599615');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9401820278320201601209', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1497' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9401820278320201601209');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8401820187270201629464', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0237' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8401820187270201629464');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9501824388120201865375', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0394' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9501824388120201865375');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE56905650752088', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1699' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE56905650752088');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES9400492795812214632978', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1110' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9400492795812214632978');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BANK POLSKI', 'PL63102052970000100202753150', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0875' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL63102052970000100202753150');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9401825400230202218259', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1399' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9401825400230202218259');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7968930001760000277111', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0562' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7968930001760000277111');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6901828674410201648473', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0601' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6901828674410201648473');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5801828323260201957471', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2024' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5801828323260201957471');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'ES5001824026850201818143', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1498' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5001824026850201818143');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7901825011130202233328', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0574' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7901825011130202233328');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2201824590190201618596', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0571' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2201824590190201618596');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE17905667089821', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1869' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE17905667089821');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4101821215880201552763', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0710' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4101821215880201552763');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101825929610201579676', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1710' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101825929610201579676');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5801826936120201599349', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1500' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5801826936120201599349');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7601825430400201696912', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0197' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7601825430400201696912');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5801820345150201849503', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0104' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5801820345150201849503');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801820956530201791525', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1761' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801820956530201791525');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4001821215810201552930', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0594' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4001821215810201552930');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE47967960010780', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0880' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE47967960010780');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES6000494668132916057748', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1613' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6000494668132916057748');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004564615902405', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1318' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004564615902405');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1068930001710000203132', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0094' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1068930001710000203132');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501827029730201591709', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1501' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501827029730201591709');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE27905698232073', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1951' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE27905698232073');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4768930001790000310617', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1216' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4768930001790000310617');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE14905029030083', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0329' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE14905029030083');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1468930001770000277844', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1502' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1468930001770000277844');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101823337970201610873', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1819' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101823337970201610873');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1501825005000201594441', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0472' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1501825005000201594441');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3400491382002010041199', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1151' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3400491382002010041199');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0968930001740000264695', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0035' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0968930001740000264695');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE84967979864559', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0286' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE84967979864559');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES0300491785912110035109', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1160' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0300491785912110035109');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101826786080201557645', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0387' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101826786080201557645');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1301820869270201892201', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0151' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1301820869270201892201');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL96109011020000000162552624', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1395' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL96109011020000000162552624');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES5000494684682816109610', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2105' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5000494684682816109610');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE70967979220925', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0674' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE70967979220925');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE75905791999751', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1925' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE75905791999751');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4101827345410201712226', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1829' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4101827345410201712226');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE63967520244308', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0089' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE63967520244308');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000079643159623', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1335' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000079643159623');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE62905708765061', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1965' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE62905708765061');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9301821366280201612013', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1271' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9301821366280201612013');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7701821275190202168446', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1503' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7701821275190202168446');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE50905153658818', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0525' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE50905153658818');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2401822232020201623706', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0438' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2401822232020201623706');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1701823577540202356127', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1833' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701823577540202356127');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004579129653505', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0532' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004579129653505');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4068930001750000264767', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0251' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4068930001750000264767');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'N26', 'ES8915632626343262594795', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0993' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8915632626343262594795');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3501822125320201601004', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1504' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3501822125320201601004');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE89967454592785', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2076' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE89967454592785');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES2800490688782711718775', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0086' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2800490688782711718775');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1801823275520201652537', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1505' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1801823275520201652537');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4201820256170201911179', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0428' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4201820256170201911179');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3401824464210201673373', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1769' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3401824464210201673373');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4301824026810201818174', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1615' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301824026810201818174');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1901820956560201769922', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0557' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1901820956560201769922');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7901820660410201673506', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1074' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7901820660410201673506');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3101827312950201650397', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0418' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3101827312950201650397');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8301829348170201629859', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0274' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8301829348170201629859');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5301827611560201680903', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0645' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5301827611560201680903');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE51905744626062', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1990' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE51905744626062');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8301821216280201606016', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1778' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8301821216280201606016');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601820845170202203572', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0683' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601820845170202203572');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201824390210201776825', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1839' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201824390210201776825');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601821226190201593209', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0240' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601821226190201593209');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8200492439152515445505', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2083' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8200492439152515445505');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8001826855870201804580', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0015' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8001826855870201804580');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7701821965170201698805', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1073' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7701821965170201698805');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6401821215810201552886', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0087' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6401821215810201552886');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3701821216210201606023', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1781' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3701821216210201606023');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201821007250203466254', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0404' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201821007250203466254');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401820317950201583048', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1506' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401820317950201583048');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2668930001700000289126', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0431' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2668930001700000289126');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3768930001740000214624', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0117' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3768930001740000214624');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE57905421341735', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0495' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE57905421341735');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5868930001710000278025', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0058' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5868930001710000278025');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE96967004262205', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1306' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE96967004262205');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES3621001943310700005744', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2008' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3621001943310700005744');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601824018120201704988', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2066' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601824018120201704988');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE26905731265829', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1999' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE26905731265829');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8201828323200201956751', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1889' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201828323200201956751');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8168930001760000207138', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0307' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8168930001760000207138');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0401828680310200392907', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0681' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401828680310200392907');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2568930001710000200631', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1299' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2568930001710000200631');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601824018150201700726', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1805' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601824018150201700726');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8601820275170201680517', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1507' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8601820275170201680517');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7168930001710000347437', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2070' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7168930001710000347437');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3300493002552114785810', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0300' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3300493002552114785810');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3468930001740000258134', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0501' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3468930001740000258134');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7701827351310201604195', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0408' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7701827351310201604195');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9101820602170201607235', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1958' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9101820602170201607235');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2201822125330201600995', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1508' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2201822125330201600995');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES4700492439192115432683', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1509' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4700492439192115432683');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601823463650201658514', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1721' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601823463650201658514');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9801824072690201756981', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0871' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9801824072690201756981');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1468930001720000332021', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1879' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1468930001720000332021');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7868930001770000277371', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0943' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7868930001770000277371');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601821245110201668186', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1892' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601821245110201668186');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE62967473049461', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0466' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE62967473049461');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'FR7616598000014000103859228', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0042' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7616598000014000103859228');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9101822125350201601110', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1510' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9101822125350201601110');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401821275150202174100', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1803' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401821275150202174100');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE72905592079216', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1617' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE72905592079216');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1001827345460201706234', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0022' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1001827345460201706234');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50003603689910602465777', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0724' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003603689910602465777');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6101820021840201572141', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1618' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6101820021840201572141');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2168930001710000264141', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0365' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2168930001710000264141');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BPI', 'PT50001000005943848000188', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1511' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000005943848000188');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'REVOLUT', 'FR7628233000019584729674546', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0866' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7628233000019584729674546');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES5500494890272216158848', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0728' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5500494890272216158848');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000066562990923', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1246' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000066562990923');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE29967486940164', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0193' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE29967486940164');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4901820600030201750300', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1992' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901820600030201750300');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES0600493001022914234522', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0567' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0600493001022914234522');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601820079040201560862', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0238' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601820079040201560862');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5801822082190201690192', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2028' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5801822082190201690192');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE57967882474135', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0068' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE57967882474135');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE60905033413170', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0893' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE60905033413170');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6701823660110201646345', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0872' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6701823660110201646345');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL08109019260000000158301856', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0276' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL08109019260000000158301856');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9101820382780201671312', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0053' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9101820382780201671312');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601828674430201649315', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0033' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601828674430201649315');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES5500497348142810044797', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0891' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5500497348142810044797');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7801820869270201893068', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0130' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801820869270201893068');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'IKUALO', 'ES1767170003343518945242', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1967' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1767170003343518945242');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3901821714110200332896', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0255' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3901821714110200332896');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE15905375625130', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1200' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE15905375625130');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7001820369420201682737', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0895' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7001820369420201682737');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES8921000045830200672951', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0112' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8921000045830200672951');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0701828181120202323620', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0346' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0701828181120202323620');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0201822738650201621226', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0311' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0201822738650201621226');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5268930001710000302868', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1414' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5268930001710000302868');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4868930001740000264769', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0587' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4868930001740000264769');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1501820043110201679721', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0419' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1501820043110201679721');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES5700494488732110086691', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0470' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5700494488732110086691');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1468930001790000266203', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0203' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1468930001790000266203');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401822234130201680172', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1975' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401822234130201680172');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE18967897366665', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0122' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE18967897366665');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9201828191710202048748', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0064' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201828191710202048748');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE69905402954878', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0802' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE69905402954878');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3801820704290201564089', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1187' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3801820704290201564089');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE64905594672752', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1709' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE64905594672752');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0468930001710000337585', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1927' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0468930001710000337585');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4301820382740201671305', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0056' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301820382740201671305');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1368930001770000266416', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1070' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1368930001770000266416');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0201820841190201658481', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1113' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0201820841190201658481');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8801822402610202092768', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1307' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801822402610202092768');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4568930001790000315309', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1701' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4568930001790000315309');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4068930001770000188912', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0385' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4068930001770000188912');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8201820382770201671329', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0054' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201820382770201671329');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE24905502143038', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0280' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE24905502143038');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE57905001971935', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0611' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE57905001971935');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE66905015290843', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0384' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE66905015290843');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'DE75100110012229421826', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0705' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'DE75100110012229421826');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4268930001730000080238', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0673' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4268930001730000080238');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1701823275530201652797', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1512' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701823275530201652797');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0200490036162611638853', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0318' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0200490036162611638853');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE63905457587908', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1513' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE63905457587908');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL15109011020000000156796259', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0623' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL15109011020000000156796259');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9600492661402714474503', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1514' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9600492661402714474503');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE78905015983886', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1515' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE78905015983886');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6400491986022910051633', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1147' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6400491986022910051633');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1768930001710000183412', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0076' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1768930001710000183412');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE34905728478390', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1974' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE34905728478390');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES7500490198642110469215', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0830' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7500490198642110469215');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3301825332190207500432', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1924' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3301825332190207500432');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2801821991380201597545', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1747' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2801821991380201597545');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1901820606820201792647', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1435' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1901820606820201792647');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4168930001790000335072', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2001' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4168930001790000335072');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401823275520201654120', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1675' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401823275520201654120');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE77905487467342', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1674' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE77905487467342');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES1000494488782710087388', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0642' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1000494488782710087388');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE92905055505023', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0509' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE92905055505023');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1701820698200201627094', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1796' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701820698200201627094');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0768930001740000320700', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1786' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0768930001740000320700');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE39905484855719', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0067' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE39905484855719');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE19905401871512', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0205' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE19905401871512');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE23905024743491', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0894' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE23905024743491');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8768930001790000330946', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0097' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8768930001790000330946');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES9821004247162200314099', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2037' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9821004247162200314099');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL19109011020000000156323797', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0504' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL19109011020000000156323797');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6801826786030201557737', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1518' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6801826786030201557737');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4201823212810201577204', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0820' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4201823212810201577204');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2801828181100202343516', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1519' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2801828181100202343516');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3101820043120201683458', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0398' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3101820043120201683458');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE63905060693008', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0182' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE63905060693008');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE58905246125379', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0502' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE58905246125379');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5801820374950201546343', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0953' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5801820374950201546343');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE11905528760848', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1662' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE11905528760848');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6301821077340201621568', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0198' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6301821077340201621568');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601820956510201800568', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2110' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601820956510201800568');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5268930001740000365480', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2119' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5268930001740000365480');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES0600490036112211648468', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0321' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0600490036112211648468');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE28905695995720', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1950' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE28905695995720');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE80905731173677', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1851' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE80905731173677');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000074274093223', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1665' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000074274093223');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2968930001720000190422', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0382' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2968930001720000190422');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE20967808368256', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0660' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE20967808368256');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401828191720202048731', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0065' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401828191720202048731');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE28967610533120', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2121' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE28967610533120');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4401823107160201737214', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0450' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4401823107160201737214');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE78905309728986', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0101' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE78905309728986');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3501820374930201546176', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0468' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3501820374930201546176');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE29905391012764', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0146' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE29905391012764');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5601824960220201664327', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1772' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5601824960220201664327');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE15905484653130', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1522' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE15905484653130');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7801825430410201698185', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1204' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801825430410201698185');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3100495413552116095173', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0044' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3100495413552116095173');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8168930001730000270238', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0137' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8168930001730000270238');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE90905155251032', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0391' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE90905155251032');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0268930001700000271904', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0430' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0268930001700000271904');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'N26', 'DE54100110012482056279', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0148' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'DE54100110012482056279');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1401821077380201621575', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0199' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1401821077380201621575');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE88905678935541', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1872' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE88905678935541');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201825011110202240092', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0029' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201825011110202240092');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4301824532540201774894', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1744' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301824532540201774894');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401820706130201649748', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0196' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401820706130201649748');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8901820256160201910770', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0707' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901820256160201910770');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE70967807579425', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0766' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE70967807579425');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4301822599700203630340', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2049' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301822599700203630340');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0701825319720204170398', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0936' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0701825319720204170398');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601822563880201658196', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1981' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601822563880201658196');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4901820573120201731906', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0351' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901820573120201731906');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9801824353710201644572', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1523' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9801824353710201644572');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6001822738620201621202', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0308' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001822738620201621202');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0801822620980201646256', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1372' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0801822620980201646256');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7401820316430201587975', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1415' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7401820316430201587975');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5201821245180201659546', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0628' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5201821245180201659546');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4301828323200201956386', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1690' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301828323200201956386');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2768930001710000331642', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1961' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2768930001710000331642');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0600491785942910044833', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1132' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0600491785942910044833');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2901820559470202080063', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0416' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2901820559470202080063');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE37967394262728', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0040' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE37967394262728');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6001828674490201649407', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1524' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001828674490201649407');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7968930001730000264454', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0614' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7968930001730000264454');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1701820079090201561001', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1416' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701820079090201561001');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5168930001790000312194', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1525' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5168930001790000312194');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9801820652620201526744', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0322' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9801820652620201526744');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401821245150201668193', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1865' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401821245150201668193');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5801824003170201677563', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1929' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5801824003170201677563');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE24905719908038', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1980' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE24905719908038');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES8221000765870200553267', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1526' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8221000765870200553267');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4101829730270200357785', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1527' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4101829730270200357785');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4101820702370201644738', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0524' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4101820702370201644738');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE91967901887976', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0789' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE91967901887976');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'AD4700031101127494110101', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1956' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'AD4700031101127494110101');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE83967925530415', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0127' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE83967925530415');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE19905151844312', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0381' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE19905151844312');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9701820573160201731913', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0352' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9701820573160201731913');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6501822680280201764291', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1685' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6501822680280201764291');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3401820581190201598737', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1065' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3401820581190201598737');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004556279072505', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0216' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004556279072505');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5901827345420201706227', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1079' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5901827345420201706227');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2501824904710202870606', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1852' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501824904710202870606');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9401828674420201648459', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0123' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9401828674420201648459');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE67905040408587', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0206' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE67905040408587');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0901822247030201677691', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1883' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0901822247030201677691');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES2400495126582916249989', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1670' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2400495126582916249989');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1168930001790000334254', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1993' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1168930001790000334254');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE58967001767079', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1275' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE58967001767079');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2101820956570201775075', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0824' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101820956570201775075');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4668930001770000238080', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0512' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4668930001770000238080');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1901827071740201669997', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0555' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1901827071740201669997');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE69905347257478', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0108' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE69905347257478');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE25905272897682', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0492' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE25905272897682');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES3421002343370700501429', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1529' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3421002343370700501429');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE04905044991031', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0691' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE04905044991031');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9601828739160202511299', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0355' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9601828739160202511299');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE05967055359175', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0547' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE05967055359175');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7001828674490201644280', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0725' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7001828674490201644280');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9401826556140201665521', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0268' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9401826556140201665521');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4001825322270000481753', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1093' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4001825322270000481753');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE24905249671438', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0211' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE24905249671438');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2001828181100202345697', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1782' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2001828181100202345697');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5268930001780000339288', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1991' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5268930001780000339288');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50003300004556867532705', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0069' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004556867532705');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5201828181160202348610', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0552' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5201828181160202348610');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE93905622794567', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1763' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE93905622794567');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE85967365645506', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0301' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE85967365645506');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0421005002450200173577', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0591' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0421005002450200173577');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3601820578410204477121', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0171' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3601820578410204477121');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5001826380990201607704', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0585' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5001826380990201607704');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201826855830201804573', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0017' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201826855830201804573');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8101823275590201652612', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1530' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8101823275590201652612');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1501820956520201800551', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2113' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1501820956520201800551');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'FR7616598000014000103859519', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0034' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7616598000014000103859519');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE20905250022456', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0109' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE20905250022456');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7101828674480201644020', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0731' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101828674480201644020');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5101820021880201572028', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0028' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5101820021880201572028');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101821461300201957356', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1698' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101821461300201957356');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7001820704250201564485', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1531' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7001820704250201564485');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4301828318890201640818', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0164' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301828318890201640818');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE87967886059394', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0671' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE87967886059394');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9301826855800201797123', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0014' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9301826855800201797123');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE29905708144564', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1715' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE29905708144564');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401820956510201791556', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1757' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401820956510201791556');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4021006507720200537609', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1532' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4021006507720200537609');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50000700000077386299423', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1167' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000077386299423');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE05967048782575', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0376' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE05967048782575');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3601820702300201646529', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0518' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3601820702300201646529');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101824032720202917901', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1671' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101824032720202917901');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE38905575963472', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1756' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE38905575963472');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7601824032720202917895', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1669' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7601824032720202917895');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE15905109175830', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1446' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE15905109175830');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6101821064210201981985', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0818' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6101821064210201981985');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004579394259805', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0533' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004579394259805');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8201827421560202706926', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1680' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201827421560202706926');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE46905330928136', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1533' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE46905330928136');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9668930001750000304499', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1437' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9668930001750000304499');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE90905278198532', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0380' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE90905278198532');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0701821965130201698515', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0597' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0701821965130201698515');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2801825011140202240405', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0379' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2801825011140202240405');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE47905531266680', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0215' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE47905531266680');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4268930001700000246546', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0002' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4268930001700000246546');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601823275560201652544', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1534' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601823275560201652544');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3000494930222716400026', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1896' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3000494930222716400026');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5801820371560201664222', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0490' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5801820371560201664222');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8401820702320201650126', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0560' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8401820702320201650126');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0568930001730000332716', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1944' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0568930001730000332716');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE44967885006845', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0952' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE44967885006845');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6668930001730000370224', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2107' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6668930001730000370224');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6001820936020201700662', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1536' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001820936020201700662');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2968930001710000203081', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0378' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2968930001710000203081');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8701820710180201566550', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0437' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701820710180201566550');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BPI', 'PT50001000006148680000179', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1417' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000006148680000179');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE32905037034102', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0658' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE32905037034102');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE05905450523375', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1427' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE05905450523375');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1168930001750000239487', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0605' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1168930001750000239487');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101824003140201678085', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2061' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101824003140201678085');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5201828181140202340463', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0377' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5201828181140202340463');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0701822247060201677677', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1875' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0701822247060201677677');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401820573110201733056', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0353' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401820573110201733056');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2901824532540201773303', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1428' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2901824532540201773303');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE11905151935248', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0291' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE11905151935248');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES1921000109030200690257', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0163' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1921000109030200690257');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9201820622450201560613', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0390' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201820622450201560613');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3501824021570202060401', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1080' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3501824021570202060401');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0901820374920201546596', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0181' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0901820374920201546596');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE80967828371777', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0110' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE80967828371777');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9715761212171010404045', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0212' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9715761212171010404045');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3801827029740201591730', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1538' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3801827029740201591730');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7668930001760000238365', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0298' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7668930001760000238365');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1301826398230201694808', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0260' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1301826398230201694808');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4668930001790000299383', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1971' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4668930001790000299383');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE85905575782206', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1777' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE85905575782206');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3300494912702416482571', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0227' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3300494912702416482571');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAJA RURAL DE UTRERA', 'ES5630200004912147354910', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0981' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5630200004912147354910');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE33905108246246', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0461' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE33905108246246');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3101825011120202242098', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1969' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3101825011120202242098');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2601825319720206710583', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1296' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601825319720206710583');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4601825011140202228926', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0090' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4601825011140202228926');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801828732110202078933', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1954' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801828732110202078933');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5901826752030201556883', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0439' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5901826752030201556883');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5368930001720000275641', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1539' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5368930001720000275641');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BPI', 'PT50001000006156965000166', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1629' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000006156965000166');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4401827541340201607849', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0561' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4401827541340201607849');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5968930001710000242602', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1066' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5968930001710000242602');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES6721005002400200173464', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0248' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6721005002400200173464');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE21967544590803', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2101' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE21967544590803');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2301824477310201583773', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1687' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2301824477310201583773');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6900490054582912499880', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1143' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6900490054582912499880');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101824018100201700894', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1799' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101824018100201700894');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE04905292884231', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0441' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE04905292884231');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES5721006473630200190632', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1825' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5721006473630200190632');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4568930001750000350134', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2036' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4568930001750000350134');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401821481850201576942', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0399' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401821481850201576942');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE43905296140401', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0978' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE43905296140401');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8468930001710000265529', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1540' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8468930001710000265529');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5601824610550201951034', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1912' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5601824610550201951034');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE52905033057809', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1222' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE52905033057809');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES6221000802470700032345', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1795' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6221000802470700032345');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1068930001750000241251', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1952' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1068930001750000241251');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601820108990201644510', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1732' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601820108990201644510');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1001820371520201664215', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0489' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1001820371520201664215');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE25905104272882', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0324' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE25905104272882');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE14905677057983', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1858' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE14905677057983');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE60967874407270', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0540' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE60967874407270');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4901820652660201526751', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1097' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901820652660201526751');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7801820519520204679469', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1820' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801820519520204679469');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601825319770205499847', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0244' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601825319770205499847');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES9621000536320200679389', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1284' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9621000536320200679389');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7701825430490201692088', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0293' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7701825430490201692088');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE56967939757988', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1023' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE56967939757988');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES0721002814460701009678', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0474' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0721002814460701009678');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9801820917050201746953', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1541' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9801820917050201746953');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50001000006182052000168', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0443' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000006182052000168');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6368930001750000328858', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1843' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6368930001750000328858');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8401820845130202207574', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0426' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8401820845130202207574');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7768930001760000284131', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0304' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7768930001760000284131');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4568930001740000182082', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0162' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4568930001740000182082');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES0900496682042710106753', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0190' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0900496682042710106753');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES9421002254110200783607', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1848' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9421002254110200783607');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE69905034771978', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0267' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE69905034771978');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7701820573190201733193', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0484' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7701820573190201733193');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501820606870201786655', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0395' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501820606870201786655');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE79967562597033', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2118' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE79967562597033');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0801825011100202233298', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0093' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0801825011100202233298');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9701823365130201825357', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0031' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9701823365130201825357');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE52905178034009', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0889' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE52905178034009');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4168930001700000264994', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1189' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4168930001700000264994');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8901824242100201756287', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1240' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901824242100201756287');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9800490036112211638373', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0323' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9800490036112211638373');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'REVOLUT', 'LT503250067069531632', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2072' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LT503250067069531632');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4168930001770000368150', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2106' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4168930001770000368150');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7501820894160201613730', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0050' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7501820894160201613730');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL67109019260000000159996451', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1199' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL67109019260000000159996451');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE68905436997434', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1543' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE68905436997434');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE65905108096096', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0105' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE65905108096096');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7101824641110201640873', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0263' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101824641110201640873');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0268930001710000346739', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2065' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0268930001710000346739');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8701827029710201592450', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1544' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701827029710201592450');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4401825141560201586218', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1340' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4401825141560201586218');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501822012990201642435', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1755' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501822012990201642435');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE41905676885710', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1693' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE41905676885710');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE81905550738624', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1696' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE81905550738624');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE20905049979356', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0261' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE20905049979356');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9301822499320202693947', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0165' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9301822499320202693947');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES1321002332100200482163', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1988' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1321002332100200482163');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES4721004247140700002438', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1794' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4721004247140700002438');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4801821433090201890540', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0236' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4801821433090201890540');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7501827312960201649362', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0037' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7501827312960201649362');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0868930001710000335476', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1930' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0868930001710000335476');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1701820507910204548500', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0409' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701820507910204548500');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1201820382730201671039', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0679' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1201820382730201671039');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1401821227480201582448', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1429' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1401821227480201582448');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101827665140201904796', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0055' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101827665140201904796');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7801820704240201564584', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1545' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801820704240201564584');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE71967808582969', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1344' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE71967808582969');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8268930001790000275843', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1071' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8268930001790000275843');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2701823275590201653196', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0799' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2701823275590201653196');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES0600490269232611398935', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1845' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0600490269232611398935');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE96967500232905', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0604' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE96967500232905');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4601824590110201618459', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0568' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4601824590110201618459');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3300495547962716117758', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1894' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3300495547962716117758');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9401826800960201794803', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0770' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9401826800960201794803');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5701822656840201599252', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0314' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5701822656840201599252');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE84905555495159', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1726' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE84905555495159');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0401826553810201608233', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1377' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401826553810201608233');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601828320940201886480', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0102' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601828320940201886480');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4901825430450201691818', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0333' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901825430450201691818');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES5821001550210700026167', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2000' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5821001550210700026167');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7001822012990201644257', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1885' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7001822012990201644257');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES2600494668152716057551', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1430' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2600494668152716057551');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8968930001770000277464', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0306' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8968930001770000277464');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE35905062073337', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0174' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE35905062073337');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2901828674450201646378', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0716' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2901828674450201646378');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9201824670920201593269', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0369' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201824670920201593269');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1601820317990201580599', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0941' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1601820317990201580599');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE94905190887014', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0440' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE94905190887014');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6068930001700000356802', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2077' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6068930001700000356802');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8301827312920201649317', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0417' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8301827312920201649317');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3868930001770000335418', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2004' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3868930001770000335418');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE47967912791180', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1092' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE47967912791180');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4901820315160201531210', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0410' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901820315160201531210');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9801820710160201566062', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0639' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9801820710160201566062');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101825430430201691450', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0043' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101825430430201691450');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801823418220201724943', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1546' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801823418220201724943');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE14905600854783', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1547' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE14905600854783');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1501826595620201676609', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1592' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1501826595620201676609');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1901826786010201554837', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0375' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1901826786010201554837');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE78905679754886', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1827' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE78905679754886');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9168930001790000242604', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1067' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9168930001790000242604');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9401825005010201596850', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1068' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9401825005010201596850');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6121007673590701130906', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1548' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6121007673590701130906');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PT50001800035536148902085', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1320' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001800035536148902085');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1001820496670201794679', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0478' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1001820496670201794679');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2501820043100201683373', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1049' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501820043100201683373');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5501822626670201694547', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0693' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5501822626670201694547');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2201826734510202010348', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0425' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2201826734510202010348');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE76905035607895', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0025' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE76905035607895');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6701820845140202203466', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0584' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6701820845140202203466');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9601825870810201951806', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0988' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9601825870810201951806');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4701828674430201648480', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0641' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4701828674430201648480');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601827218230201701742', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2132' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601827218230201701742');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'DE61100110012439330175', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1175' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'DE61100110012439330175');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9001824353780201629629', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0413' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9001824353780201629629');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5821005002480200173816', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0951' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5821005002480200173816');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE67905162492787', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0892' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE67905162492787');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1901828181180202337951', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0281' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1901828181180202337951');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4301824018100201700900', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1814' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301824018100201700900');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE64905491144652', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1422' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE64905491144652');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9701823397230202293523', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0259' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9701823397230202293523');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8601825003130201626382', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1423' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8601825003130201626382');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3601820382700201671336', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0051' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3601820382700201671336');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1501824023410201615439', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1813' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1501824023410201615439');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE74905008051007', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1242' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE74905008051007');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1501828181160202339285', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0488' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1501828181160202339285');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5068930001760000329237', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1959' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5068930001760000329237');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'ACTIVOBANK', 'PT50002300004557297427094', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1314' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50002300004557297427094');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50000700000061564561523', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0541' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000061564561523');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE24905694387338', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2139' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE24905694387338');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004559173436105', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1258' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004559173436105');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'REVOLUT', 'LT313250084155081516', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0027' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LT313250084155081516');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3868930001700000272420', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0564' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3868930001700000272420');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8668930001770000306133', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1681' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8668930001770000306133');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601822808810201601350', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1866' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601822808810201601350');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4301820374920201547148', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0344' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4301820374920201547148');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8701826337420201581329', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1266' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701826337420201581329');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES9100495415492918107262', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0131' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9100495415492918107262');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3601825323730201615811', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1203' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3601825323730201615811');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5001828191790202048724', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0066' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5001828191790202048724');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6201822620940201647808', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0228' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6201822620940201647808');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE38905037448572', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0765' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE38905037448572');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4601823100890201797389', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1942' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4601823100890201797389');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE03905036974484', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0556' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE03905036974484');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1001828181170202356592', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1785' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1001828181170202356592');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4968930001720000332264', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1953' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4968930001720000332264');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8901825332120207933357', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0514' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901825332120207933357');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3401827345400201713274', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1893' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3401827345400201713274');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6168930001710000191447', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1369' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6168930001710000191447');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7268930001780000259582', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1552' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7268930001780000259582');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE76905232711895', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2032' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE76905232711895');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE52905358463709', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1089' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE52905358463709');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5201821245180201668179', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1873' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5201821245180201668179');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1601825011160202234024', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0095' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1601825011160202234024');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1168930001710000373252', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2099' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1168930001710000373252');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000079942259123', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1336' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000079942259123');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE61967978725417', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0319' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE61967978725417');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601826552310201610240', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0289' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601826552310201610240');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES7500497405052610052569', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1767' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7500497405052610052569');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9201823107110201737177', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1207' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201823107110201737177');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9268930001720000368447', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2116' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9268930001720000368447');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1568930001720000309984', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1737' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1568930001720000309984');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9101823350150201602532', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0118' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9101823350150201602532');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6301825996310201595470', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2112' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6301825996310201595470');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5968930001790000296627', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0542' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5968930001790000296627');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2001827345470201710855', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1705' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2001827345470201710855');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1801828182450203086309', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0498' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1801828182450203086309');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4801824353710201640525', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1170' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4801824353710201640525');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE03905026362684', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0046' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE03905026362684');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2701820845120202204575', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1191' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2701820845120202204575');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9368930001700000277638', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0099' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9368930001700000277638');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES7000492604492915302688', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1846' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7000492604492915302688');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE91905005885176', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0374' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE91905005885176');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5168930001710000333635', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1881' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5168930001710000333635');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2268930001730000339200', 'ATIVO', 'Importado via Planilha de Controle ID - Observações RH: PROVISIONAL'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2014' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2268930001730000339200');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES7800492961532314415767', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1229' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7800492961532314415767');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2401822771350201645579', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1081' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2401822771350201645579');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES7300497476652010051548', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0838' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7300497476652010051548');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4768930001750000288406', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1269' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4768930001750000288406');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE07905707000166', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1919' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE07905707000166');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES9800494269112214072010', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1247' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9800494269112214072010');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1101820382770201673189', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0684' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101820382770201673189');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9301828181110202340357', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0549' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9301828181110202340357');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9601820670140201610197', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0258' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9601820670140201610197');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101825319780208878717', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1862' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101825319780208878717');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3468930001710000255565', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0793' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3468930001710000255565');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3600495432502617599413', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1359' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3600495432502617599413');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50003300004566101767805', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0805' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004566101767805');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES3515761212111010549500', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1745' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3515761212111010549500');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50026901120020056755117', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1554' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50026901120020056755117');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES3668930001770000296751', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1438' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3668930001770000296751');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6368930001760000335502', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1928' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6368930001760000335502');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE47905685874980', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1899' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE47905685874980');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6401821797360204086112', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0287' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6401821797360204086112');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50003601359910004761674', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1797' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003601359910004761674');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE23905686496891', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1910' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE23905686496891');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50019300001050075452746', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0704' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50019300001050075452746');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BANK POLSKI', 'PL37102037140000400204891950', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2117' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL37102037140000400204891950');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004565058736505', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1339' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004565058736505');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3801826337460201581336', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1267' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3801826337460201581336');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0901820733120201658957', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2085' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0901820733120201658957');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4068930001790000270294', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0373' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4068930001790000270294');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3901824590160201618534', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0569' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3901824590160201618534');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8100490128562010971951', 'ATIVO', 'Importado via Planilha de Controle ID - Observações RH: x'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1556' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8100490128562010971951');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXADIRECTA', 'PT50003507740012879800030', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0217' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003507740012879800030');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE79967899536233', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0121' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE79967899536233');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE25905749128882', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2035' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE25905749128882');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5901820894170201616685', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0505' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5901820894170201616685');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE79905688916033', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1440' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE79905688916033');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3801820855710202087690', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1917' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3801820855710202087690');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2701821503210201656843', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1836' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2701821503210201656843');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2501828674430201649070', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0467' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501828674430201649070');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801820689130201615163', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2016' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801820689130201615163');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3000494488772810086705', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0471' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3000494488772810086705');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'ACTIVOBANK', 'PT50002300004557263156994', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1327' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50002300004557263156994');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3000492439182215433345', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1557' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3000492439182215433345');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE02905476001740', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1558' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE02905476001740');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE72905314057816', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0366' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE72905314057816');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE19905714512212', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1941' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE19905714512212');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3601820702300201644783', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0521' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3601820702300201644783');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000081561790523', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0246' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000081561790523');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE32905440301902', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0607' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE32905440301902');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2301820043150201679769', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0586' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2301820043150201679769');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8101820704200201565211', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1727' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8101820704200201565211');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BPI', 'PT50001000006175118000176', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1338' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000006175118000176');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000064711823523', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1328' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000064711823523');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000077964632823', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1638' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000077964632823');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE71967962560769', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0644' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE71967962560769');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE19967820420912', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0945' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE19967820420912');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE59967996923526', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0575' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE59967996923526');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE36905039476781', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0207' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE36905039476781');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4801827424950201606273', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1734' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4801827424950201606273');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'IKUALO', 'ES5067170003399255797749', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1871' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5067170003399255797749');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE05905009212175', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0147' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE05905009212175');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4768930001790000269295', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1559' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4768930001790000269295');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL41109028350000000153502671', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1262' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL41109028350000000153502671');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'REVOLUT', 'LT213250021736432968', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0003' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LT213250021736432968');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8468930001720000335417', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1994' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8468930001720000335417');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE42905450647354', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1639' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE42905450647354');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1868930001780000266374', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0883' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1868930001780000266374');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE10905062108804', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1230' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE10905062108804');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4068930001710000162240', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0640' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4068930001710000162240');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4901820917090201746960', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0464' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901820917090201746960');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES9700492795852914662231', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0780' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9700492795852914662231');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8701821930500201640170', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1849' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701821930500201640170');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6001828181150202336972', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0282' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001828181150202336972');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6668930001790000267401', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0485' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6668930001790000267401');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0301820021840201571148', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1560' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0301820021840201571148');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5001824021510202060425', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0218' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5001824021510202060425');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9501821965120201697659', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0480' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9501821965120201697659');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1068930001720000281556', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1561' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1068930001720000281556');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0601821077390201621476', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0479' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601821077390201621476');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES1700493001062514234549', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0566' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1700493001062514234549');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3701822626650201695939', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0792' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3701822626650201695939');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3001828674410201644228', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0734' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3001828674410201644228');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1701823507400202309388', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0019' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701823507400202309388');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE56905670782588', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1752' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE56905670782588');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9301820606840201781711', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0392' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9301820606840201781711');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9501828181130202338671', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0372' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9501828181130202338671');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5101821509190201596651', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0126' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5101821509190201596651');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0468930001740000266143', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0204' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0468930001740000266143');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0201829792540200310511', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1828' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0201829792540200310511');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4601827345440201714802', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2053' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4601827345440201714802');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PT50001800035495376502048', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0072' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001800035495376502048');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50003300004557022267105', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0652' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004557022267105');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES3815761212101010519619', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1441' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3815761212101010519619');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'PT50003503610000450653025', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1321' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003503610000450653025');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE66967603289543', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2088' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE66967603289543');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'EUROBIC', 'PT50007900008499565910128', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0603' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50007900008499565910128');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES2421002473910210512483', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0423' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2421002473910210512483');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8001820706150201645302', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0458' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8001820706150201645302');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE88905740462641', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1720' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE88905740462641');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE39905379901719', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0149' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE39905379901719');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1068930001740000292904', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1442' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1068930001740000292904');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7401828181130202353890', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1780' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7401828181130202353890');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8501820646740201650462', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1562' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501820646740201650462');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2401826551950201697594', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0515' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2401826551950201697594');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE34905575887690', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1672' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE34905575887690');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2401820075250201669028', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0635' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2401820075250201669028');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0201824010390201833798', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1802' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0201824010390201833798');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE72905042739116', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1227' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE72905042739116');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6868930001780000318242', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1751' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6868930001780000318242');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1068930001710000181016', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0273' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1068930001710000181016');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9168930001710000291302', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0526' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9168930001710000291302');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'FR7616598000014000112313942', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1714' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7616598000014000112313942');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES2621001943350700005631', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2009' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2621001943350700005631');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7601826800980201791828', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0595' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7601826800980201791828');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL76109026880000000150526174', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1263' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL76109026880000000150526174');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5668930001730000222479', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0788' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5668930001730000222479');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4368930001780000340517', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2007' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4368930001780000340517');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE57905297269035', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2143' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE57905297269035');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES1500490932462111364222', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0596' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1500490932462111364222');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8301827351300201604621', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1077' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8301827351300201604621');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4420800035113040063029', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1281' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4420800035113040063029');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1901822939820200174922', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1563' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1901822939820200174922');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE38905112206472', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0349' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE38905112206472');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201828323220201956874', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1940' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201828323220201956874');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8201824026840201818198', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1564' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201824026840201818198');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7901824414640201557623', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0551' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7901824414640201557623');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004579125521305', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0088' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004579125521305');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE06905721856122', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1844' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE06905721856122');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE28905015754120', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0444' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE28905015754120');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4368930001770000162668', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0447' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4368930001770000162668');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5301824924180201724674', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0400' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5301824924180201724674');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8201821216230201605600', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1754' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201821216230201605600');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7801825011180202240085', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0638' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801825011180202240085');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6301822808890201599059', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1076' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6301822808890201599059');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50003300004556135056605', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0726' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004556135056605');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3768930001750000363082', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2109' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3768930001750000363082');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2768930001730000210294', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1218' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2768930001730000210294');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE80905562248177', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1753' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE80905562248177');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6201826517750201966243', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0476' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6201826517750201966243');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE25905725489982', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1877' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE25905725489982');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'FR7616598000014000091876333', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0023' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7616598000014000091876333');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'N26', 'ES6415632626313264634041', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0367' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6415632626313264634041');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7768930001750000335008', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1913' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7768930001750000335008');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1401826936110201599608', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1566' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1401826936110201599608');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE20905418026456', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0159' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE20905418026456');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES1700496980272210074594', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1287' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1700496980272210074594');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE20905070068056', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0522' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE20905070068056');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8701821527500204758597', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0626' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701821527500204758597');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7368930001740000204179', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1202' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7368930001740000204179');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9201820275130201679247', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0241' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201820275130201679247');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401826786020201557553', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0371' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401826786020201557553');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1368930001790000275824', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1289' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1368930001790000275824');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5301826380960201601201', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0222' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5301826380960201601201');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4201825430410201691849', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0345' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4201825430410201691849');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE57967834856835', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0539' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE57967834856835');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0768930001730000250521', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0326' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0768930001730000250521');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0501823507420202312319', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0412' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0501823507420202312319');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5101826786060201557799', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1719' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5101826786060201557799');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE67967941552387', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0453' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE67967941552387');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE58905035712979', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0433' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE58905035712979');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE79967577748433', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0172' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE79967577748433');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE25905445237582', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1444' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE25905445237582');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0301824004490201677614', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0465' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0301824004490201677614');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4401820917090201747147', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1569' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4401820917090201747147');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES3721007917082000502403', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0496' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3721007917082000502403');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9701821275110202173619', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1779' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9701821275110202173619');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE55967434926744', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0132' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE55967434926744');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000071020752023', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0220' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000071020752023');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8001821275120202174070', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1800' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8001821275120202174070');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7801825319790000181172', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2096' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801825319790000181172');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE16967639667674', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0245' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE16967639667674');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5301821245110201662393', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0535' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5301821245110201662393');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'ACTIVOBANK', 'PT50002300004577732572294', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0811' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50002300004577732572294');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3101821005310201725898', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2059' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3101821005310201725898');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES9301826720130202312720', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1571' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9301826720130202312720');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE11905250011948', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0748' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE11905250011948');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4701829034570201671601', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2125' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4701829034570201671601');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501823275560201653172', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1572' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501823275560201653172');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5568930001730000274004', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0074' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5568930001730000274004');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE72905450536816', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1424' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE72905450536816');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801821965180201698461', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0598' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801821965180201698461');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000063260635623', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1445' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000063260635623');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2501826092450201750136', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1573' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501826092450201750136');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1201827351310201604201', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1075' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1201827351310201604201');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE32905691628902', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1905' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE32905691628902');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0668930001790000165855', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0606' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0668930001790000165855');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE56905003247988', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0531' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE56905003247988');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5501822229570201618663', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1996' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5501822229570201618663');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9801820845150202204605', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0616' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9801820845150202204605');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'NL16BUNQ2126040151', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0664' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL16BUNQ2126040151');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE04905166978231', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0790' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE04905166978231');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2868930001760000288311', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1574' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2868930001760000288311');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3368930001710000294092', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1575' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3368930001710000294092');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3601820573190201733155', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0486' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3601820573190201733155');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2501825430470201696905', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0200' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501825430470201696905');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE43905772672301', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2060' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE43905772672301');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7301824641160201646703', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1816' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7301824641160201646703');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5201825899310201706636', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0327' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5201825899310201706636');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE97905460317749', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0634' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE97905460317749');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401822455610201653384', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1729' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401822455610201653384');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE16905163965874', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0290' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE16905163965874');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4101828323200201956713', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1890' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4101828323200201956713');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6001822455630201653636', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1425' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001822455630201653636');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2701820731010201606310', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0264' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2701820731010201606310');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5401821300100201884229', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1977' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5401821300100201884229');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9201822661250201600875', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1576' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201822661250201600875');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1801820927800201651098', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2128' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1801820927800201651098');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE07905290394866', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0370' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE07905290394866');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE21905672888603', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1791' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE21905672888603');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601820345170201859252', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1789' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601820345170201859252');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8901824353780201630326', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1171' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901824353780201630326');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BPI', 'PT50001000006030847000167', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1329' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000006030847000167');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE98905034821993', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0462' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE98905034821993');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50000700000066662833023', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0223' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000066662833023');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8501827081440201594119', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0048' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8501827081440201594119');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1868930001740000269674', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0620' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1868930001740000269674');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE18967989400265', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0320' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE18967989400265');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE57905477504735', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1426' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE57905477504735');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE87905199780294', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0448' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE87905199780294');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6168930001740000281704', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0098' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6168930001740000281704');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5668930001750000360121', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2091' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5668930001750000360121');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE78905719359986', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2006' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE78905719359986');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8201820841110201658306', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0335' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201820841110201658306');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE71905194015969', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2146' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE71905194015969');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5601821216280201607569', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1906' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5601821216280201607569');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7568930001710000266273', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0749' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7568930001710000266273');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6001820297390202025485', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0008' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001820297390202025485');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9301826556190201674024', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1717' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9301826556190201674024');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE76905028856695', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0580' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE76905028856695');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2701828191780202053164', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1783' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2701828191780202053164');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1401826194700201623729', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1436' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1401826194700201623729');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3101821965100201698812', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0082' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3101821965100201698812');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES9221001927790200455124', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1968' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9221001927790200455124');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6168930001740000204977', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0242' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6168930001740000204977');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE25905782428982', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2047' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE25905782428982');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE33967962539046', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0680' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE33967962539046');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5201820702380201645267', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0510' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5201820702380201645267');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1001820956550201769939', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1354' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1001820956550201769939');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE49967608316971', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2124' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE49967608316971');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'NL41BUNQ2126610837', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0848' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL41BUNQ2126610837');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES5900496123372116204775', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1775' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5900496123372116204775');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES9615761212181010498589', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1914' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9615761212181010498589');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5001820917050201752570', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1809' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5001820917050201752570');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2501824023480201609775', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0511' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501824023480201609775');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101820249640204339066', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0538' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101820249640204339066');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES5721004247112200314112', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2022' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5721004247112200314112');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4768930001710000250772', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0299' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4768930001710000250772');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0568930001730000295565', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1678' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0568930001730000295565');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8768930001780000272407', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0563' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8768930001780000272407');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES7500491256332510300334', 'ATIVO', 'Importado via Planilha de Controle ID - Observações RH: PENDIENTE CERTIFICADO BANCARIO'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0005' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7500491256332510300334');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8101820883130201733726', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0503' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8101820883130201733726');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000081156301423', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1315' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000081156301423');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8901820382710201676638', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1834' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901820382710201676638');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6001820625800201818799', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1114' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001820625800201818799');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0301823275590201654113', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1578' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0301823275590201654113');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50003300004569711225105', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0806' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004569711225105');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5668930001740000281018', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0116' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5668930001740000281018');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3201821250410201578795', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0602' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201821250410201578795');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601824960210201664099', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0036' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601824960210201664099');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4801822808810201599042', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0081' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4801822808810201599042');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8901822808810201599080', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0080' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8901822808810201599080');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE81905741469724', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2051' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE81905741469724');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'ACTIVOBANK', 'PT50002300004566154952994', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1259' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50002300004566154952994');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5301822229580201612733', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1072' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5301822229580201612733');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8601828181170202330295', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0678' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8601828181170202330295');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9701821418940201617553', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1903' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9701821418940201617553');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5101821758920201781899', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0136' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5101821758920201781899');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101822738640201628388', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0312' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101822738640201628388');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4368930001720000333633', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1880' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4368930001720000333633');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PT50001800036449274702062', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1260' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001800036449274702062');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE13967049816839', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0742' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE13967049816839');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6868930001710000152618', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0018' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6868930001710000152618');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6415830001199073441635', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0703' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6415830001199073441635');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101820846420202060282', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1702' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101820846420202060282');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8301826092420201750112', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1579' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8301826092420201750112');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BANK POLSKI', 'PL45102036680000540206612909', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1986' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL45102036680000540206612909');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES2000494668152716057756', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1648' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2000494668152716057756');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES2401829730280200353677', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1087' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2401829730280200353677');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7201824027290201884558', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2068' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7201824027290201884558');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE37967435002728', 'ATIVO', 'Importado via Planilha de Controle ID - Observações RH: DATOS DE STOCCO'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0224' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE37967435002728');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0301821245120201668773', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1811' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0301821245120201668773');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8268930001740000283072', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0554' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8268930001740000283072');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6568930001750000303214', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1649' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6568930001750000303214');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE18967728489665', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0916' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE18967728489665');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES6001820841130201658313', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1112' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6001820841130201658313');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE55905616593944', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1768' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE55905616593944');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9268930001710000205148', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1286' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9268930001710000205148');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES0700490622642110041354', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1581' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0700490622642110041354');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8401820702340201646536', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0523' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8401820702340201646536');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE44967827243345', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0779' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE44967827243345');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1268930001710000333658', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1841' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1268930001710000333658');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6801825141510201586225', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0310' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6801825141510201586225');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES0968930001700000293700', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1582' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0968930001700000293700');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PT50001800035536183602089', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1443' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001800035536183602089');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES4868930001720000310263', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1738' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4868930001720000310263');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6401826194750201621129', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0315' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6401826194750201621129');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE04905060511031', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0001' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE04905060511031');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1101820974020201749696', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0445' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101820974020201749696');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0468930001750000135726', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0650' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0468930001750000135726');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5901821212470201564783', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0422' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5901821212470201564783');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6768930001730000285622', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0446' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6768930001730000285622');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE90967932312432', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0946' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE90967932312432');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0568930001740000272818', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0588' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0568930001740000272818');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE33905114017746', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0457' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE33905114017746');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE69905247172878', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0178' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE69905247172878');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4201821758940201793797', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1733' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4201821758940201793797');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3301828191770202050486', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0061' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3301828191770202050486');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4201828674440201648909', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0751' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4201828674440201648909');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES7301822350180201601590', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0583' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7301822350180201601590');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE08905622876413', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1583' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE08905622876413');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'PT50003507010000856973068', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1584' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003507010000856973068');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3501820702360201651006', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0576' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3501820702360201651006');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5501821965170201698522', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0316' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5501821965170201698522');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE27967470732373', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0807' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE27967470732373');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8201828320910201894058', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1792' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201828320910201894058');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8201821758910201781875', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1045' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201821758910201781875');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES6468930001710000299257', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1741' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6468930001710000299257');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES4621003222220700011313', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0047' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4621003222220700011313');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'CAIXABANK', 'ES7021002814410701009565', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0475' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7021002814410701009565');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0568930001780000264474', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0368' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0568930001780000264474');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2901820606880201783540', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0393' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2901820606880201783540');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE83905302184915', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1301' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE83905302184915');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES1701823212850201577167', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0343' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1701823212850201577167');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE18905709764565', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1920' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE18905709764565');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2601823507490202327506', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0653' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2601823507490202327506');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9368930001720000360087', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2097' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9368930001720000360087');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4801820917080201752556', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1807' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4801820917080201752556');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES9100491256352110300369', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0045' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9100491256352110300369');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE42967410212154', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0262' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE42967410212154');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0401828181120202345499', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0288' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0401828181120202345499');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4501824041120202737031', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1955' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4501824041120202737031');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000077661003423', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0577' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000077661003423');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NOVOBANCO', 'PT50000700000068641293523', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0935' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50000700000068641293523');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8401820701920201610279', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0612' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8401820701920201610279');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8801820786110201658038', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0582' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801820786110201658038');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5801820702380201650300', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0517' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5801820702380201650300');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BPI', 'PT50001000006145259000105', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0455' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001000006145259000105');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'PT50002300004556231377694', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1183' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50002300004556231377694');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004578403278705', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0092' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004578403278705');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004571505211005', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1337' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004571505211005');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8401826139660201654030', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1863' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8401826139660201654030');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE17905586899921', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1711' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE17905586899921');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES6500495396362216145925', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1818' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6500495396362216145925');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5501821250400201578818', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1384' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5501821250400201578818');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE58905004731179', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1195' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE58905004731179');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'ES6115761212191010437090', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0649' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6115761212191010437090');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE70967854100625', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0760' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE70967854100625');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE51967971357962', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0070' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE51967971357962');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9601827345490201712202', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1810' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9601827345490201712202');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE81967890824724', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0762' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE81967890824724');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE32967961816802', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1196' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE32967961816802');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2801822738620201621196', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0309' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2801822738620201621196');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'MILLENNIUM', 'PT50003300004579184817405', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0091' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50003300004579184817405');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4768930001720000275846', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0075' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4768930001720000275846');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES0968930001710000330511', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1939' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0968930001710000330511');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES1301824208170201866779', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0610' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1301824208170201866779');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9601820702350201653934', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1938' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9601820702350201653934');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE76905687224795', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1847' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE76905687224795');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE84905199757359', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0007' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE84905199757359');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE19905500452612', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1949' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE19905500452612');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES6400490573302810335459', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0700' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6400490573302810335459');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2768930001770000279744', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0234' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2768930001770000279744');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES0201820731050201606273', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0520' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0201820731050201606273');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601821216220201598953', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0266' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601821216220201598953');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8401821005370201725232', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1926' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8401821005370201725232');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8201820316490201588701', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2034' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8201820316490201588701');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL44109028350000000162590741', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0630' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL44109028350000000162590741');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES9068930001700000269253', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1585' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9068930001700000269253');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES7901821150020201593881', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1831' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7901821150020201593881');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES3968930001710000319107', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1718' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3968930001710000319107');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES4968930001730000346765', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2058' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4968930001730000346765');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL28109011020000000156796995', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0493' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL28109011020000000156796995');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2901820670100201610920', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0296' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2901820670100201610920');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9101822082150201689891', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2031' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9101822082150201689891');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES8101820702310201650423', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1357' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8101820702310201650423');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3701823275520201653165', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1586' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3701823275520201653165');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE50967793843518', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1135' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE50967793843518');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES3401820702330201644769', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0519' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3401820702330201644769');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES3600494835192116391915', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0619' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3600494835192116391915');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE47967963822880', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0714' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE47967963822880');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES1268930001760000258238', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0317' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1268930001760000258238');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4901822249130201572785', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1587' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4901822249130201572785');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'PL79109011020000000162326532', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1398' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL79109011020000000162326532');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5701820374910201546169', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0111' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5701820374910201546169');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5701822620940201646249', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1371' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5701822620940201646249');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES8668930001760000334021', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1972' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8668930001760000334021');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BUNQ', 'FR7627633121290504045072673', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1788' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'FR7627633121290504045072673');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES2300495103702416733258', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1288' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2300495103702416733258');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES2768930001720000365543', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2123' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2768930001720000365543');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE39905288556819', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0230' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE39905288556819');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE84967795564559', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0528' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE84967795564559');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE49905463288171', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0636' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE49905463288171');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE76905725568895', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1739' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE76905725568895');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE74905020331207', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0469' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE74905020331207');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2701820927810201651081', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2129' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2701820927810201651081');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES9201820708040201670939', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0305' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9201820708040201670939');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'ES5601820043100201679905', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0411' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5601820043100201679905');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES7468930001720000272159', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0358' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7468930001720000272159');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE85905088405706', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0397' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE85905088405706');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE56905655136488', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1830' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE56905655136488');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'NICKEL', 'ES5868930001790000274723', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0589' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5868930001790000274723');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE10905786572704', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1886' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE10905786572704');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601820382770201679668', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2063' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601820382770201679668');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE24905038095038', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0633' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE24905038095038');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4001820394360201761182', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0032' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4001820394360201761182');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES5501820079000201560855', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0239' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5501820079000201560855');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE88967864122341', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0173' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE88967864122341');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES6601822824430201712009', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0791' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601822824430201712009');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8001824390250201776832', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1945' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8001824390250201776832');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES8801827541310201609241', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0350' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801827541310201609241');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE81967778246524', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0269' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE81967778246524');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'Banco Não Informado', 'BE36967783412681', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0758' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE36967783412681');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES4501825011100202242623', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E2064' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4501825011100202242623');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'BBVA', 'ES2101820573160201733087', 'ATIVO', 'Importado via Planilha de Controle ID - Observações RH: INFORMACION ULTIMO PAGO NOMINA'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0354' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2101820573160201733087');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE95905315778958', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0405' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE95905315778958');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'WISE', 'BE11967002695148', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E1055' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE11967002695148');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                SELECT id, 'SANTANDER', 'ES6600496682062510106761', 'ATIVO', 'Importado via Planilha de Controle ID'
                FROM core_personal.workers 
                WHERE cod_colab = 'E0192' 
                AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6600496682062510106761');