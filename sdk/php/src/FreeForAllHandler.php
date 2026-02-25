<?php

declare(strict_types=1);

namespace Viancen\FreeForAll;

use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Level;
use Monolog\LogRecord;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Sends log records to a FreeForAll ingestion API (POST /api/v1/ingest).
 * Compatible with Laravel, Symfony, and plain PHP. Monolog 2 and 3.
 */
final class FreeForAllHandler extends AbstractProcessingHandler
{
    private string $ingestUrl;
    private string $apiKey;
    private Client $client;
    private int $timeout;

    public function __construct(
        string $ingestUrl,
        string $apiKey,
        int|string|Level $level = Level::Debug,
        bool $bubble = true,
        int $timeout = 1
    ) {
        parent::__construct($level, $bubble);
        $this->ingestUrl = rtrim($ingestUrl, '/') . '/api/v1/ingest';
        $this->apiKey = $apiKey;
        $this->timeout = $timeout;
        $this->client = new Client([
            'timeout' => $this->timeout,
            'connect_timeout' => $this->timeout,
        ]);
    }

    protected function write(LogRecord $record): void
    {
        $context = $record->context;
        $environment = $context['environment'] ?? ($_ENV['APP_ENV'] ?? 'production');
        $hostname = $context['hostname'] ?? gethostname() ?: null;
        $contextFiltered = $context;
        unset($contextFiltered['environment'], $contextFiltered['hostname']);

        $payload = [
            'level' => $record->level->getName(),
            'message' => $record->message,
            'context' => $contextFiltered,
            'environment' => $environment,
            'hostname' => $hostname,
        ];

        try {
            $this->client->post($this->ingestUrl, [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-FreeForAll-Key' => $this->apiKey,
                ],
                'json' => $payload,
            ]);
        } catch (GuzzleException $e) {
            // Fire-and-forget: do not throw; avoid breaking the app
        }
    }
}
