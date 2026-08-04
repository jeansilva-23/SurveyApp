DO $$
DECLARE
    v_org_id uuid;
    v_user_id uuid;
    v_survey1_id uuid;
    v_survey2_id uuid;
    v_survey3_id uuid;
    v_q1_s1 uuid;
    v_q2_s1 uuid;
    v_q3_s1 uuid;
    v_q1_s2 uuid;
    v_q2_s2 uuid;
    v_q1_s3 uuid;
    v_resp1 uuid;
    v_resp2 uuid;
    v_resp3 uuid;
    v_resp4 uuid;
BEGIN
    -- Pega o ID do primeiro usuário e sua organização para atrelar os dados
    SELECT id, org_id INTO v_user_id, v_org_id FROM profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado. Crie uma conta no app primeiro.';
    END IF;

    ---------------------------------------------------------
    -- 1. CRIAR PESQUISA ATIVA COM VÁRIAS RESPOSTAS
    ---------------------------------------------------------
    INSERT INTO surveys (org_id, created_by, title, description, type, status, is_anonymous)
    VALUES (v_org_id, v_user_id, 'Pesquisa de Clima Organizacional', 'Por favor, seja honesto. Suas respostas são 100% anônimas e ajudam a melhorar nosso ambiente.', 'satisfacao', 'ativa', true)
    RETURNING id INTO v_survey1_id;

    -- Perguntas da Pesquisa 1
    INSERT INTO survey_questions (survey_id, title, type, order_index, required)
    VALUES (v_survey1_id, 'De 0 a 10, qual a chance de você recomendar a empresa como um bom lugar para trabalhar?', 'nps', 0, true)
    RETURNING id INTO v_q1_s1;
    
    INSERT INTO survey_questions (survey_id, title, type, order_index, required, options)
    VALUES (v_survey1_id, 'Qual seu modelo de trabalho preferido?', 'unica_escolha', 1, true, '["100% Remoto", "Híbrido (maioria remoto)", "Híbrido (maioria presencial)", "100% Presencial"]'::jsonb)
    RETURNING id INTO v_q2_s1;

    INSERT INTO survey_questions (survey_id, title, type, order_index, required)
    VALUES (v_survey1_id, 'O que poderíamos melhorar?', 'texto_longo', 2, false)
    RETURNING id INTO v_q3_s1;

    -- Resposta 1 (Web)
    INSERT INTO survey_responses (survey_id, source) VALUES (v_survey1_id, 'web') RETURNING id INTO v_resp1;
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q1_s1, v_resp1, '9'::jsonb);
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q2_s1, v_resp1, '"100% Remoto"'::jsonb);
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q3_s1, v_resp1, '"Mais flexibilidade de horários."'::jsonb);

    -- Resposta 2 (App)
    INSERT INTO survey_responses (survey_id, source) VALUES (v_survey1_id, 'app') RETURNING id INTO v_resp2;
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q1_s1, v_resp2, '7'::jsonb);
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q2_s1, v_resp2, '"Híbrido (maioria remoto)"'::jsonb);

    -- Resposta 3 (Web)
    INSERT INTO survey_responses (survey_id, source) VALUES (v_survey1_id, 'web') RETURNING id INTO v_resp3;
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q1_s1, v_resp3, '10'::jsonb);
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q2_s1, v_resp3, '"100% Remoto"'::jsonb);
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q3_s1, v_resp3, '"Nada, tudo perfeito!"'::jsonb);

    UPDATE surveys SET response_count = 3 WHERE id = v_survey1_id;

    ---------------------------------------------------------
    -- 2. CRIAR PESQUISA EM RASCUNHO
    ---------------------------------------------------------
    INSERT INTO surveys (org_id, created_by, title, description, type, status, is_anonymous)
    VALUES (v_org_id, v_user_id, 'Inscrição para o Hackathon 2026', 'Preencha seus dados para participar da maratona de programação.', 'formulario', 'rascunho', false)
    RETURNING id INTO v_survey2_id;

    INSERT INTO survey_questions (survey_id, title, type, order_index, required)
    VALUES (v_survey2_id, 'Qual o seu nome completo?', 'texto_curto', 0, true)
    RETURNING id INTO v_q1_s2;

    INSERT INTO survey_questions (survey_id, title, type, order_index, required, options)
    VALUES (v_survey2_id, 'Quais linguagens você domina?', 'multipla_escolha', 1, true, '["React Native", "TypeScript", "Python", "Rust", "Go"]'::jsonb)
    RETURNING id INTO v_q2_s2;

    ---------------------------------------------------------
    -- 3. CRIAR PESQUISA ENCERRADA COM RESULTADOS
    ---------------------------------------------------------
    INSERT INTO surveys (org_id, created_by, title, description, type, status, is_anonymous)
    VALUES (v_org_id, v_user_id, 'Feedback da Nova Ferramenta Interna', 'Pesquisa rápida sobre o novo sistema implantado mês passado.', 'satisfacao', 'encerrada', true)
    RETURNING id INTO v_survey3_id;

    INSERT INTO survey_questions (survey_id, title, type, order_index, required)
    VALUES (v_survey3_id, 'Como você avalia a facilidade de uso?', 'escala', 0, true)
    RETURNING id INTO v_q1_s3;

    INSERT INTO survey_responses (survey_id, source) VALUES (v_survey3_id, 'app') RETURNING id INTO v_resp4;
    INSERT INTO survey_answers (question_id, response_id, answer_value) VALUES (v_q1_s3, v_resp4, '4'::jsonb);

    UPDATE surveys SET response_count = 1 WHERE id = v_survey3_id;

END $$;
