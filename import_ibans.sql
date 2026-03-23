-- Script de Migração de IBANs extraídos da planilha do Excel
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE93905290491967', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ALBERTO ISMAEL MENDIETA CACERES%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE93905290491967');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Português', 'PT50001800035744329302015', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ALBERTO RICHELLI DA SILVA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PT50001800035744329302015');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES5501821214330201624902', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ALDEMAR DOMINGUEZ CERCADO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5501821214330201624902');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES2968930001740000367834', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ALEXANDER GUZMAN%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2968930001740000367834');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Holandês', 'NL02BUNQ2185043757', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ALVARO ENRIQUE ROJAS DE LA OSSA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL02BUNQ2185043757');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES2721001553690200374216', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ANDY LYONEL CARRASCO VARGAS%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2721001553690200374216');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES9001820581120201601758', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ANGEL RAFAEL DIAZ GUTIERREZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9001820581120201601758');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES7101825322210002961488', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ANTONY ALEXANDER HERNANDEZ CHIRINOS%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7101825322210002961488');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES0868930001760000346871', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%APOLINAR GARCIA HERNANDEZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0868930001760000346871');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE29967554229064', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%BOLIVAR GABRIEL ALDANA RAMIREZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE29967554229064');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES7401829035110201734235', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%BYRON YESID SUAREZ CUADRADO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7401829035110201734235');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES8801825900090201571022', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%CARLOS ALBERTO CARDONA YAIMA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8801825900090201571022');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES7121000868590201072129', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%CARLOS JULIO CANON%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7121000868590201072129');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES2501820838650201575647', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%CARLOS MARIO JARAMILLO LOPEZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2501820838650201575647');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES8568930001730000341558', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%CESAR NORBEY PENAGOS DUQUE%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8568930001730000341558');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE67967609472887', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%CLAUDEMIR DO NASCIMENTO FURTADO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE67967609472887');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES3201825319770000834229', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%CRISTIAN RAFAEL ORDONEZ AGUIRRE%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3201825319770000834229');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES8701821077370201624772', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%EDGAR CORRALES HOYOS%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8701821077370201624772');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Holandês', 'NL52BUNQ2185106392', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%EDILBERTO DOMINGUEZ PEREIRA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'NL52BUNQ2185106392');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES1101824036530201672085', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%EISON RAFAEL IBARRA SIERRA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1101824036530201672085');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE23967554435491', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%FRANKLIN JOSE DIAZ LINCE%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE23967554435491');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES1301820869270201892201', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%GUILLERMO LEON POSADA LONDONO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1301820869270201892201');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES5000494684682816109610', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%GUSTAVO ADOLFO DEL ANGEL MONTERO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5000494684682816109610');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE89967454592785', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%HAYDER RAFAEL DIAZ MANAURE%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE89967454592785');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE96967004262205', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%HENRY ALEXANDER RAMIREZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE96967004262205');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES8921000045830200672951', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JAHIR SURLEY DELGADO AGREDO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES8921000045830200672951');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES0601820956510201800568', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JEISON ALEXANDER GONZALEZ FARFAN%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES0601820956510201800568');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES5268930001740000365480', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JEISON ANDRES REYES PACHECO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5268930001740000365480');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE28967610533120', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JESUS ALBERTO PENARANDA VILLALOBOS%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE28967610533120');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES3100495413552116095173', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JESUS JAMES BALDEON ZUNIGA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3100495413552116095173');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES1501820956520201800551', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JONNY ENRIQUE CURA VARGAS%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1501820956520201800551');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES6668930001730000370224', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JOSE ALEXANDER CALDERON AGUDELO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6668930001730000370224');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE21967544590803', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JOSE JONATHAN CANO SALAZAR%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE21967544590803');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE79967562597033', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JUAN CARLOS CASTRO BARRAGAN%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE79967562597033');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Não Informado', 'LT503250067069531632', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JUAN CARLOS RONDON COSSIO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'LT503250067069531632');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES4168930001770000368150', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JUAN CARLOS TORRES LEON%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4168930001770000368150');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES6068930001700000356802', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JULIAN JAVIER PEARSON GUERRERO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6068930001700000356802');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES6121007673590701130906', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%JUSED CHAMORRO MENDEZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6121007673590701130906');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES6601827218230201701742', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%KLINSMANN ANDRE COLINA MARIN%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601827218230201701742');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE24905694387338', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%LUCAS VINICIUS FRANCO NOVAKOWSKI%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE24905694387338');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE76905232711895', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%LUIS ANTONIO SOTO VIDAL%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE76905232711895');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES1168930001710000373252', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%LUIS DIOMEDES RODRIGUEZ USTARIS%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1168930001710000373252');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES9268930001720000368447', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%LUIS ENRIQUE LOPEZ CRESPO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9268930001720000368447');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES6301825996310201595470', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%LUIS FELIPE TRILLOS NAVARRO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6301825996310201595470');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Não Informado', 'PL37102037140000400204891950', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%MARCELO JAVIER GARCIA RUIZ DIAZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'PL37102037140000400204891950');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE66967603289543', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%MOISES MUNOZ ZAMBRANO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE66967603289543');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES2421002473910210512483', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%NASSER MOHAMAD MERES LUNA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2421002473910210512483');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE57905297269035', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%NESTOR JAVIER BARRIOS PENA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE57905297269035');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES3768930001750000363082', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%OLMEDO ARIEL HERNANDEZ GONZALEZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES3768930001750000363082');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES7801825319790000181172', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%PASTOR JOSE FERNANDEZ CANELO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES7801825319790000181172');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES4701829034570201671601', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%PEDRO ALEXANDER ROJAS RODRIGUEZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4701829034570201671601');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES1801820927800201651098', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%RANDYS MIGUEL NIEBLES HURTADO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES1801820927800201651098');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES5668930001750000360121', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%RICARDO RAFAEL BONILLA BLANCO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES5668930001750000360121');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE71905194015969', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%RICHARD ANDERSON RUIZ BARRETO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE71905194015969');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Belga', 'BE49967608316971', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%ROBERTO CASTILLA JIMENEZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'BE49967608316971');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES9368930001720000360087', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%VICTOR JAVIER RIERA FLORES%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9368930001720000360087');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES9068930001700000269253', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%WILMER FERNANDO ROJAS RAMIREZ%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES9068930001700000269253');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES2768930001720000365543', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%YEFERSON DANIEL NEIRA ESPINOSA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2768930001720000365543');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES2701820927810201651081', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%YEISON HUGO ANGEL CALDERON%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES2701820927810201651081');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES6601820382770201679668', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%YIMIS ALFREDO FERNANDEZ PENA%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES6601820382770201679668');
INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
    SELECT id, 'Banco Espanhol', 'ES4501825011100202242623', 'ATIVO', 'Importado via Planilha de Controle'
    FROM core_personal.workers 
    WHERE nome ILIKE '%YORVY RAFAEL MARTINEZ ROMERO%' 
    AND id NOT IN (SELECT worker_id FROM core_personal.worker_ibans WHERE iban = 'ES4501825011100202242623');