INSERT INTO public.plans (name, description, price_cents, currency, interval, features, is_popular, is_active, sort_order, looks_per_month)
VALUES
('Plano Essencial', 'Diagnóstico de estilo masculino com curadoria mensal para o homem que valoriza presença.', 4700, 'BRL', 'monthly',
 '["3 diagnósticos por mês","Análise de coloração e biotipo","Recomendações de smart casual","Suporte por email"]'::jsonb,
 false, true, 1, 3),
('Plano Premium', 'Diagnóstico avançado com 5 recomendações de estilo e alfaiataria mensais. Cancele quando quiser. Sem fidelidade.', 9700, 'BRL', 'monthly',
 '["5 diagnósticos por mês","Curadoria de alfaiataria sob medida","Looks executivos e casuais","Acesso a guias de imagem premium","Suporte prioritário"]'::jsonb,
 true, true, 2, 5),
('Plano Elite', 'Consultoria completa para o executivo exigente, com 7 análises mensais e referências de menswear global.', 19700, 'BRL', 'monthly',
 '["7 diagnósticos por mês","Atendimento sob demanda","Curadoria internacional (Mr Porter, The Armoury)","Guarda-roupa estratégico completo","Suporte VIP dedicado"]'::jsonb,
 false, true, 3, 7);